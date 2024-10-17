import {useCallback, useContext, useEffect, useState} from "react";
import {AuthApi} from "../AuthApi.ts";
import {v4} from "uuid"

const Home = (props) => {
    const {selfId, socketRef: socket} = useContext(AuthApi)

    const waitForConnection = useCallback(function (callback, interval) {

        if (socket.current.readyState === 1) {
            console.log("callback")
            callback();
        } else {
            console.log("Timeout")
            // optional: implement backoff for interval here
            setTimeout(function () {
                waitForConnection(callback, interval);
            }, interval);
        }
    }, [socket]);


    const [rooms, setRooms] = useState([])

    socket.current.onmessage = (ev) => {

        const parsed = JSON.parse(ev.data)
        console.log(parsed)
        switch (parsed.event) {
            case "sendRooms":{
                const gettingRooms = parsed.data.roomsIds
                console.log(gettingRooms)
                setRooms(gettingRooms)
                break
            }
            default: {
                console.log("Default", parsed.event)
            }
        }
    }
    const getRooms = useCallback(()=>{
        socket.current.send(JSON.stringify({
            "event": "getRooms",
            "data": {
                "userId": selfId.current,
            }
        }))
    },[selfId, socket])

    const start = useCallback(()=>{
        waitForConnection(()=>getRooms(), 200)
    }, [getRooms, waitForConnection])


    const createRoom = useCallback(()=>{
        socket.current.send(JSON.stringify({
            "event": "createRoom",
            "data": {
                "roomId": v4(),
                "userId": selfId.current,
            }
        }))
    },[selfId, socket])

    useEffect(()=>{
        start()
    }, [getRooms, start])

    return (
        <div>
            <button onClick={createRoom}>createRoom</button>
            {rooms.map((room, index)=>{
                console.log(room)
                return <a key={index} href={"/room/"+room}>{room}</a>
            })}
        </div>
    )

}
export default Home