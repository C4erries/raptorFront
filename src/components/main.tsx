import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {v4} from "uuid";
import io, {Socket} from "socket.io-client";
import {WebRTCUser} from "../types";
import Video from "./Video/video.js";
const roomId = "r1"
const selfId = v4();
const  SOCKET_SERVER_URL = "http://localhost:8080"
const socket = new WebSocket(SOCKET_SERVER_URL);

const Main = () =>{

    const pc = new RTCPeerConnection()
    const dataChannel = pc.createDataChannel('test')
    pc.onicecandidate = (e) => {
        console.log("onicecandidate");
        waitForConnection(()=>{socket.send(JSON.stringify({
            "event": "candidate",
            "data": {
                "self_id": selfId,
                "room_id": roomId,
                "candidate": e.candidate
            }
        }))}, 100)
    };
    pc.onnegotiationneeded = (e)=>{
        console.log("123",e)
        sendOffer()
            .catch(e => console.warn(e))
        return false
    }
    const sendOffer = async () => {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        console.log(offer);
        const message = JSON.stringify({
            "event": "offer",
            "data": {
                "offer": offer,
                "self_id": selfId,
                "room_id": roomId,
            }
        })
        socket.send(message);
        console.log(message)
    }
    const sendAnswer = async (_answer) => {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        console.log(offer);
        const message = JSON.stringify({
            "event": "answer",
            "data": {
                "typ": _answer.type,
                "sdp": _answer.sdp,
            }
        })
        socket.send(message);
        console.log(message)
    }

    socket.onmessage = async m => {
        const parsed = JSON.parse(m.data)
        console.log(parsed)
        switch (parsed.event) {
            case "answer": {
                console.log("answer")
                pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(parsed.data)))
                    .catch(err => console.error(err))
                break;
            }
            case "candidate": {
                console.log(JSON.parse(parsed.data).candidate)
                if(!parsed.candidate) return;
                pc.addIceCandidate(new RTCIceCandidate(JSON.parse(parsed.data).candidate))
                    .catch(err => console.error(err))
                break;
            }
            case "offer": {
                console.log(JSON.parse(parsed.data))
                pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(parsed.data)))
                    .catch(err => console.error(err))
                pc.createAnswer().then(answer => sendAnswer(answer)).catch(err => console.error(err))
            }
            default: {
                console.log("Default" + parsed.event)
                break;
            }
        }
    }
    const localStreamRef = useRef<MediaStream>();
    const pcRef = useRef<RTCPeerConnection>();
    const [streams, setStreams] = useState<Array<MediaStream>>([])
    //const [users, setUsers] = useState<Array<WebRTCUser>>([]);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const createPeerConnection = ()=>{

    }
    pc.ontrack = (e) => {
        console.log("ontrack success");
        setStreams((oldStreams) =>{
            const stream = new(MediaStream)()
            stream.addTrack(e.track)
            return oldStreams.concat([stream])
        });
    };
   // console.log(pc.getTransceivers())
    const joinRoom = useCallback(()=>{
        socket.send(JSON.stringify({
            "event": "joinRoom",
            "data": {
                "self_id": selfId,
                "room_id": roomId,
            }
        }));
    }, [])

    const sendTracks = useCallback(()=>{
        if(localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track)
            })
        }
        else console.log("localStream undefined")
    }, [])


    const getLocalStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    width: 240,
                    height: 240,
                },
            });
            console.log("getting stream")
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            if (!socket) return;
        } catch (e) {
            console.log(`getUserMedia error: ${e}`);
        }
    }, []);
    const waitForConnection = function (callback, interval) {
        if (socket.readyState === 1) {
            callback();
        } else {
            // optional: implement backoff for interval here
            setTimeout(function () {
                waitForConnection(callback, interval);
            }, interval);
        }
    };

    const connect = () =>{

        const send =  () => {
            waitForConnection(async function () {
                await getLocalStream()
                setTimeout(()=>createPeerConnection(), 500)
                await joinRoom()
                setTimeout(()=>sendOffer(), 500)

                console.log("waited")
            }, 1000);
        };
        send();
    }

    useEffect(()=>{

    }, [])




    return (
        <div>
            <button onClick={connect}>Connect</button>
            <button onClick={sendTracks}>SendTracks</button>
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
            {streams.map((stream, index) => (
                <Video key={index} stream={stream} />
            ))}
        </div>
    )
}



export default Main