export class WebRtcUser{
    id: string;
    pc: RTCPeerConnection;
    streams: Array<MediaStreamTrack> = [];
    sendIce: Function
    updateStreams: Function

    constructor(id: string, sendIce: Function, updateStreams: Function) {
        this.id = id;
        this.sendIce = sendIce;
        this.updateStreams = updateStreams
    }

    addTrack(tracks:Array<MediaStreamTrack>){
        if(this.pc)
            if(tracks) tracks.forEach(track => {
                if(track) {
                    console.log(track)
                    this.pc.addTrack(track)
                }
            })
    }

    async createPeerConnection(offer?: RTCSessionDescriptionInit, tracks?:Array<MediaStreamTrack>) {
        const pc = new RTCPeerConnection()

        if(offer) { //add new User

            if(tracks) tracks.forEach(track => {
                if(track) {
                    console.log(track)
                    pc.addTrack(track)
                }
            })

            pc.ontrack = (ev) => {
                console.log("onTrack", ev.track, ev.streams)
                if (!ev) return

                this.updateStreams((prev:Array<MediaStreamTrack>)=>{
                    return [...prev, ev.track]
                })
                //this.streams.push(ev.track);
            }

           // pc.onnegotiationneeded= (ev) => {

           // }
            pc.onicecandidate = (ev) => {
                if (!this.sendIce) return;
                this.sendIce(this.id, ev.candidate)
            }
            pc.oniceconnectionstatechange = (e) => {
                console.log(e);
            };


            await pc.setRemoteDescription(offer)



            let answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            this.pc = pc;
            return answer
        }
        //connect to user
        pc.ontrack = (ev) => {
            console.log("onTrack", ev.track, ev.streams)
            if (!ev) return

            this.updateStreams((prev:Array<MediaStreamTrack>)=>{
                return [...prev, ev.track]
            })
            //this.streams.push(ev.track);
        }
        console.log(tracks)
        if(tracks) tracks.forEach(track => {
            if(track) {
                console.log(track)
                pc.addTrack(track)
            }
        })
        const newOffer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        })

        await pc.setLocalDescription(newOffer)
        this.pc = pc;
        return newOffer
    }



    async claimAnswer(answer: RTCSessionDescriptionInit) {
        await this.pc.setRemoteDescription(answer).catch(err => console.error(err))
        return this.streams
    }
    claimCandidate(candidate: RTCIceCandidateInit){
        this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => console.error(err));
    }

     async claimOffer(offer: RTCSessionDescriptionInit) {
        await this.pc.setRemoteDescription(offer)
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer)
            .catch(err => console.error(err))
        return answer
    }





}