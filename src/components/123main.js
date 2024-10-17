import {useCallback, useEffect, useRef, useState} from "react";
import {v4} from "uuid";
import {VideoPlayer} from "./VideoPlayer.tsx";
import {io} from "socket.io-client";
const socket = new WebSocket("http://localhost:8080")
const room = "r1"
const selfID = v4();


const pc_config = {
    bundlePolicy: "max-bundle",
    iceServers: [
        // {
        //   urls: 'stun:[STUN_IP]:[PORT]',
        //   'credentials': '[YOR CREDENTIALS]',
        //   'username': '[USERNAME]'
        // },
        {
            urls: "stun:stun.l.google.com:19302",
        },
    ],
};

const createSenderPeerConnection = () => {
    const peerConnection = new RTCPeerConnection({bundlePolicy: "max-bundle", iceServers: [{urls: "stun:stun.l.google.com:19302",},]});
    peerConnection.onicecandidate = ev => {
        if (ev.candidate !== null) {
            sendCandidate(ev.candidate, selfID, room).catch(err => console.log(err))
            console.log("onIce")
            //console.log('icecandidate', JSON.stringify(peerConnection.localDescription))
        }
    }
    peerConnection.oniceconnectionstatechange = e => {
        console.log(e);
    };
    peerConnection.onstream = (e)=> {
        console.log("StreamLog: "+e)
        //videoElement.srcObject = e.streams[0];
        return false;
    }
    peerConnection.onnegotiationneeded = (e)=>{
        console.log(e)
        peerConnection.createOffer()
            .then(_offer => peerConnection.setLocalDescription(_offer))
            //.then(_offer => sendOffer(_offer,idState,roomState))
            .catch(e => console.warn(e))
        return false
    }
}
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
const send =  (message, callback) => {
    waitForConnection(function () {
        socket.send(message);
        if (typeof callback !== 'undefined') {
            callback();
        }
    }, 1000);
};




socket.onmessage = async m => {
    const parsed = JSON.parse(m.data)
    console.log(parsed)
    switch (parsed.event) {
        case "answer": {
            console.log("answer")
            peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(parsed.data)))
                .catch(err => console.error(err))
            break;
        }
        case "candidate": {
            console.log(JSON.parse(parsed.data).candidate)
            if(!parsed.candidate) return;
            peerConnection.addIceCandidate(new RTCIceCandidate(JSON.parse(parsed.data).candidate))
                .catch(err => console.error(err))
            break;
        }
        case "offer": {
            console.log("offer")
            peerConnection.setRemoteDescription(new RTCSessionDescription(parsed.offer))
                .catch(err => console.error(err))
            peerConnection.createAnswer().then(answer => sendAnswer(answer)).catch(err => console.error(err))
        }
        default: {
            console.log("Default" + parsed.event)
            break;
        }
    }
}
const sendAnswer = async (_answer) => {
    send(JSON.stringify({
        "event": "answer",
        "data": {
            "typ": _answer.type,
            "sdp": _answer.sdp,
        }
    }))
}
const sendOffer = async (sId, rId) => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer)

    send(JSON.stringify({
        "event": "offer",
        "data": {
            "offer": offer,
            "self_id": sId,
            "room_id": rId
        }
    }))
}
const sendCandidate = async (candidate,sId, rId) => {
    send(JSON.stringify({
        "event": "candidate",
        "data": {
            "self_id": sId,
            "room_id": rId,
            "candidate": candidate,
        }
    }))
}





async function addAudio(id, roomId){
    const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
    const tracks = stream.getTracks()
    for (const track of tracks) {
        peerConnection.addTrack(track)
    }
    await sendOffer(id, roomId)
    console.log(tracks)
}

const joinRoom = (selfId, roomId) => {
    send(JSON.stringify({
        "event": "joinRoom",
        "data": {
            "self_id": selfId,
            "room_id": roomId
        }
    }))
    //peerConnection.ontrack = ({ streams: [stream] }) => (videoElem.srcObject = stream);
}
const leaveRoom = (selfId, roomId) => {
    send(JSON.stringify({
        "event": "leaveRoom",
        "data": {
            "self_id": selfId,
            "room_id": roomId
        }
    }))
}
const newVideo = (track, key) =>{
    const stream = MediaStream()
    stream.addTrack(track)
    return <VideoPlayer stream={stream}/>
}

const Main = () =>{
    const socketRef = useRef()
    const createPeerConnection = useCallback(()=>{
        const pc = new RTCPeerConnection(pc_config)
        pc.onicecandidate = (e) => {
            if (!(e.candidate && socketRef.current)) return;
            console.log("receiver PC onicecandidate");
            socketRef.current.emit("receiverCandidate", {
                candidate: e.candidate,
                receiverSocketID: socketRef.current.id,
                senderSocketID: selfId,
            });
        };
    }, [])
    let localStream;
    let sendPC;
    const localVideoRef = useRef()
    navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: {
                width: 240,
                height: 240,
            },
        })
        .then(stream => {
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            localStream = stream;

            sendPC = createSenderPeerConnection(newSocket, localStream);
            createSenderOffer(newSocket);

            newSocket.emit("joinRoom", {
                id: newSocket.id,
                roomID: "1234",
            });
        })
        .catch(error => {
            console.log(`getUserMedia error: ${error}`);
        });

    const [roomState, setRoomState] = useState(room)
    const [idState, setIdState] = useState(selfID)
    const [tracks, setTracks] = useState([ ])
    peerConnection.ontrack = (e)=> {
        setTracks(prev => [...prev, e])
        return false;
    }
    useEffect(()=>{
        socketRef.current = io(SOCKET_SERVER_URL)
    }, [])

    //<p>selfId<input onChange={(event) => setIdState(event.target.value)}/></p>
    //<p>roomId<input onChange={(event) => setRoomState(event.target.value)}/></p>

    return <div>
        {tracks.map((value,index) => {
            const stream = new MediaStream()
            console.log(value.track)
            stream.addTrack(value.track)
            return <VideoPlayer key={index} stream={stream}/>
        })}
        <button onClick={()=>addAudio(idState, roomState)}>AddAudio</button>
        <button onClick={()=>joinRoom(idState, roomState)}>JoinRoom</button>
        <button onClick={()=>leaveRoom(idState, roomState)}>LeaveRoom</button>
        <button onClick={()=>addAudio(idState, roomState).then(e => joinRoom(idState, roomState)).catch(err => console.error(err))}>Connect</button>
        <button onClick={()=>sendOffer(idState, roomState)}>Offer</button>
        <button onClick={()=>sendHi()}>say Hi</button>
    </div>
}

const sendHi = () => {
    dataChannel.send("Hello!")
}
export default Main;