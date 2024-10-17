import {useCallback, useContext, useEffect, useRef} from "react";
import useStateWithCallback from "./useStateWithCallback";
import uuidV4 from "uuid";
import {AuthApi} from "../AuthApi";
import {WebRtcUser} from "../types/webRtcUser";
import {Answer, Candidate, GetUsers, Offer} from "../types";

const LOCAL_VIDEO = "LOCAL_VIDEO"

export default function useWebRTC(roomId){
    const selfId = useContext(AuthApi).selfId;
    const [users, updateUsers] = useStateWithCallback([]);
    const peerConnections = useRef({})
    const localMediaStream = useRef(null)
    const peerMediaElements = useRef({
        [LOCAL_VIDEO]: null,
    })
    const  addNewClient = useCallback((newCLient, cb) => {
        if(!users.include(newCLient)){
            updateUsers(list => [...list, newCLient], cb)
        }
    }, [users, updateUsers])
    const addNewUser = useCallback(async (id: string, offer: RTCSessionDescriptionInit) => {
        const user = new WebRtcUser(id, sendIce)
        const answer = await user.createPeerConnection(offer, (localStreamRef.current ? localStreamRef.current.getTracks() : undefined))
        updateUsers((prev) => [...prev, user])
        console.log(users)
        return answer
    }, [sendIce, users])
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
                    const ind = users.findIndex((user) => user.id === data.senderId)
                    if(ind !== -1){
                        const temp = users[ind]
                        await temp.claimAnswer(data.answer)
                        setUsers(prev => prev.map((user, index) => {
                            if(index === ind)
                                return temp
                            return user
                        }))
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
                    const sender = users.filter((user) => user.id === data.senderId)
                    if(sender[0]){
                        sender[0].claimCandidate(data.candidate)
                    }
                    else{
                        console.log("Candidate Sender not found")
                    }
                    break;
                }
                case "offer": {
                    const data : Offer = parsed.data
                    const sender = users.filter((user) => user.id === data.senderId)
                    if(sender[0]){
                        sender[0].claimOffer(data.offer)
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



    useEffect(()=>{
        async function startCapture(){
            localMediaStream.current = await navigator.mediaDevices.getUserMedia({audio: true, video: true})
        }

        addNewClient(LOCAL_VIDEO, () => {
            const localVideoElement = peerMediaElements.current[LOCAL_VIDEO]

            if(localVideoElement){
                localVideoElement.volume = 0.1;
                localVideoElement.srcObject = localMediaStream.current
            }

        })

        startCapture().then(() => joinRoom(selfId, roomId))
    },[roomId])



}