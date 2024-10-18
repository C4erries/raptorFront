import {useCallback, useEffect, useRef, useState} from "react";
// @ts-ignore
import {WebRtcUser} from "../types/webRtcUser.ts";
import {Answer, Candidate, GetUsers, Offer, Tracks} from "../types";

export default function useWebRTC(roomId, selfId, socketRef, localStreamRef?):(Tracks[] & any & Function){
    // @ts-ignore
    // @ts-ignore
    console.log(localStreamRef)
    const users = useRef<Map<string, WebRtcUser>>(new Map<string, WebRtcUser>())
    const [streams, setStreams] = useState<Array<Tracks>>([])

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


    const Start = useCallback(() => {
        startSocket();
        console.log("Start Socket")

    }, [startSocket])



    useEffect(()=>{
        Start()
    },[Start])
    return [streams, setStreams, joinRoom]
}