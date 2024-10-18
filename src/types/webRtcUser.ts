interface Tracks{
    id: string,
    tracks: Array<MediaStreamTrack>
}
export class WebRtcUser{
    id: string;
    pc: RTCPeerConnection;
    streams: Array<MediaStreamTrack> = [];
    sendIce: Function
    updateStreams: Function

    constructor(id: string, sendIce: Function, updateStreams: Function, setStreams) {
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

                this.updateStreams((prev:Array<Tracks>):Array<Tracks>=>{
                    const ind = prev.findIndex((obj) => obj.id === this.id)
                    if(ind === -1){
                        const track : Tracks = {id: this.id, tracks: [ev.track]}
                        return prev.concat([track])
                    }
                    const temp = prev[ind]
                    if(temp.tracks.findIndex((value) => value.id === ev.track.id) !== -1) return prev
                    temp.tracks = [...temp.tracks, ev.track]
                    return prev.map((track, index)=>(index===ind?temp:track))
                })
                this.streams.push(ev.track);
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

            this.updateStreams((prev:Array<Tracks>):Array<Tracks>=>{
                const ind = prev.findIndex((obj) => obj.id === this.id)
                if(ind === -1){
                    const track : Tracks = {id: this.id, tracks: [ev.track]}
                    return prev.concat([track])
                }
                const temp = prev[ind]
                if(temp.tracks.findIndex((value) => value.id === ev.track.id) !== -1) return prev
                temp.tracks = [...temp.tracks, ev.track]
                return prev.map((track, index)=>(index===ind?temp:track))
            })
            this.streams.push(ev.track);
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