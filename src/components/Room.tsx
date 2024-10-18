import {useCallback, useContext, useEffect, useReducer, useRef, useState} from "react";
// @ts-ignore
import Video from "./Video/video.tsx";
// @ts-ignore
import {AuthApi} from "../AuthApi.ts"
// @ts-ignore
import {WebRtcUser} from "../types/webRtcUser.ts";
import {Answer, Candidate, GetUsers, Offer} from "../types";
import {useParams} from "react-router-dom";

const reducer = (state, action) => {
    switch (action.type){
        case "":
    }
}
interface Tracks{
    id: string,
    tracks: Array<MediaStreamTrack>
}
const Room = () => {
    const {id: roomId} = useParams()
    // @ts-ignore
    const selfId = useContext(AuthApi).selfId
    // @ts-ignore
    const socketRef = useContext(AuthApi).socketRef;
    const localStreamRef = useRef<MediaStream>();
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const users = useRef<Map<string, WebRtcUser>>(new Map<string, WebRtcUser>())
    const [streams, setStreams] = useState<Array<Tracks>>([])
    /*
    const addUser = useCallback((user:WebRtcUser)=>{
        const temp = new Map<string, WebRtcUser>(users)
        temp.set(user.id, user)
        setUsers(temp)
    }, [users])
*/
    const updateStreams = useCallback((cb)=>{
        setStreams((prev):Array<Tracks> => {
            const temp = cb(prev)
            console.log(temp)
            return temp
        })
        console.log("updateStreams", streams)
    }, [streams])
    
    const sendAnswer = useCallback((receiverId: string, answer: RTCSessionDescriptionInit)=>{
        socketRef.current.send(JSON.stringify({
            "event": "answer",
            "data": {
                "answer": answer,
                "senderId": selfId.current,
                "receiverId": receiverId,
                "roomId": roomId,
            }
        }))
    },[roomId, selfId, socketRef])

    const sendIce = useCallback((receiverId: string, candidate: RTCIceCandidate)=>{
        socketRef.current.send(JSON.stringify({
            "event": "candidate",
            "data": {
                "candidate": candidate,
                "senderId": selfId.current,
                "receiverId": receiverId,
                "roomId": roomId,
            }
        }))
    },[roomId, selfId, socketRef])
    
    const sendOffer = useCallback((receiverId: string, offer: RTCSessionDescriptionInit)=>{
        socketRef.current.send(JSON.stringify({
            "event": "offer",
            "data": {
                "offer": offer,
                "senderId": selfId.current,
                "receiverId": receiverId,
                "roomId": roomId,
            }
        }))
    },[roomId, selfId, socketRef])
    
    const addNewUser = useCallback(async (id: string, offer: RTCSessionDescriptionInit) => {
        const user = new WebRtcUser(id, sendIce, updateStreams)
        const answer = await user.createPeerConnection(offer, (localStreamRef.current ? localStreamRef.current.getTracks() : undefined))
        users.current.set(id, user)
        console.log(users)
        return answer
    }, [sendIce, updateStreams, users])

    const connectUser = useCallback(async (id:string)=>{
        const user = new WebRtcUser(id, sendIce, updateStreams)
        await user.createPeerConnection(undefined, (localStreamRef.current?localStreamRef.current.getTracks():undefined)).then(offer => sendOffer(id, offer));
        console.log(user)
        users.current.set(id, user)
        console.log("connect ", id, users)
    },[sendIce, sendOffer, updateStreams, users] )
    
    const startSocket = useCallback(()=>{
        if(!socketRef.current) return
        //function prev (m) {socketRef.current.onmessage(m)}
        socketRef.current.onmessage = async m => {
            console.log(m)
            //prev(m)
            const parsed = JSON.parse(m.data)
            console.log(parsed)
            switch (parsed.event) {
                case "answer": {
                    const data : Answer = parsed.data
                    console.log("answer", users, data.senderId)
                    const user = users.current.get(data.senderId)
                    if(user){
                        await user.claimAnswer(data.answer)
                        /*
                        setUsers(prev => prev.map((user, index) => {
                            if(index === ind)
                                return temp
                            return user
                        }))
                        */
                    } else{
                        console.log("Answer Sender not found")
                    }
                    break;
                }
                case "getUsers": {
                    const data : GetUsers = parsed.data
                    console.log("getUsers Connect", data.usersIds)
                    data.usersIds.forEach((userId)=> {
                        if(userId !== selfId.current) {
                            console.log("forEach Connect")
                            connectUser(userId);
                        }
                    })
                    break;
                }
                case "candidate": {
                    const data : Candidate = parsed.data
                    if(!data.candidate) return;
                    console.log(data.candidate)
                    const sender = users.current.get(data.senderId)
                    if(sender){
                        sender.claimCandidate(data.candidate)
                    }
                    else{
                        console.log("Candidate Sender not found")
                    }
                    break;
                }
                case "offer": {
                    const data : Offer = parsed.data
                    const sender = users.current.get(data.senderId)
                    if(sender){
                        sender.claimOffer(data.offer)
                            .then(answer => sendAnswer(data.senderId, answer))
                            .catch(err => console.error(err))
                    }
                    else{
                        await addNewUser(data.senderId, data.offer)
                            .then(answer => sendAnswer(data.senderId, answer))
                            .catch(err => console.error(err))
                        console.log("New user " + data.senderId)
                    }
                    break;
                }
                default: {
                    console.log("Default" + parsed.event)
                    break;
                }
            }
        }
    },[addNewUser, connectUser, selfId, sendAnswer, socketRef, users])
    


    const joinRoom = useCallback(
        async () => {
            socketRef.current.send(JSON.stringify({
                "event": "joinRoom",
                "data": {
                    "userId": selfId.current,
                    "roomId": roomId,
                }
            }))
        },
        [roomId, selfId, socketRef]
    );

   

    const getLocalStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    width: 240,
                    height: 240,
                },
            });
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            if (!socketRef.current) return;
            
        } catch (e) {
            console.log(`getUserMedia error: ${e}`);
        }
    }, [socketRef]);



    const Start = useCallback(() => {
        getLocalStream();
        startSocket();
        console.log("Start Socket")

    }, [getLocalStream, startSocket])



useEffect(()=>{
   Start()
},[Start])

    const renderStreams = useCallback(()=>{
        return streams.map(({id, tracks}, ind) => {
            return <div key={id}>{id}{tracks.map((track, key)=>{
                switch (track.kind) {
                    case "video":{
                        return <Video track={track} key={key}/>
                    }
                    case "audio":{
                        return <div key={key}>{`Audio ${id}`}</div>
                    }
                    default: {
                        return <div key={key}>Default</div>
                    }
                }
            })}</div>
        })

    }, [streams])
    
    return (
        <div>
            {/* <button onClick={joinRoom}>Join</button> */}
            <video
                style={{
                    width: 240,
                    height: 240,
                    margin: 5,
                    backgroundColor: "black",
                }}
                muted
                ref={localVideoRef}
                autoPlay
            />
            <button onClick={joinRoom}>Join</button>
            <button onClick={()=>console.log(users)}>Log Users</button>
            {renderStreams()}
        </div>
    );
};

export default Room;