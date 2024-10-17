import {useEffect, useRef} from "react";
import * as stream from "stream";

const Video: React.FC<{track: MediaStreamTrack}> = ({track}) =>{
    const  videoRef = useRef<HTMLVideoElement>(null)

    useEffect(()=>{
        if(videoRef.current) {
            videoRef.current.srcObject = new MediaStream();
            videoRef.current.srcObject.addTrack(track)
        }
    }
    ,[track])


    return(
        <video ref={videoRef} autoPlay muted={true} />
    )
}
export default Video