import {useCallback, useContext, useEffect, useReducer, useRef, useState} from "react";
// @ts-ignore
import Video from "./Video/video.tsx";
// @ts-ignore
import {AuthApi} from "../AuthApi.ts"
// @ts-ignore
import {WebRtcUser} from "../types/webRtcUser.ts";
import {Answer, Candidate, GetUsers, Offer, Tracks} from "../types";
import {useParams} from "react-router-dom";
// @ts-ignore
import useWebRTC from "../hooks/useWebRTC.ts";

const reducer = (state, action) => {
    switch (action.type){
        case "":
    }
}
const Room = () => {
    const {id: roomId} = useParams()
    // @ts-ignore
    const selfId = useContext(AuthApi).selfId
    // @ts-ignore
    const socketRef = useContext(AuthApi).socketRef;


    const localStreamRef = useRef<MediaStream>();
    const localVideoRef = useRef<HTMLVideoElement>(null);
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
    const Start = useCallback( () => {
        getLocalStream()
        //console.log("Start Socket")
    }, [getLocalStream])
    useEffect(()=>{
        Start()
    },[Start])

    let [streams, setStreams, joinRoom] = useWebRTC(roomId, selfId, socketRef, localStreamRef)




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
            {/* <button onClick={()=>console.log(users)}>Log Users</button> */}
            {renderStreams()}
        </div>
    );
};

export default Room;