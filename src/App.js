import logo from './logo.svg';
import './App.css';
import Room from "./components/Room.tsx";
import {v4} from "uuid"
import {Route, BrowserRouter as Router, Routes, json} from "react-router-dom";
import {useCallback, useEffect, useRef, useState} from "react";
import {AuthApi} from "./AuthApi.ts";
import Home from "./components/Home";
const SOCKET_SERVER_URL = "http://localhost:8080"
const socket= new WebSocket(SOCKET_SERVER_URL)


function App(callback, deps) {
    const socketRef = useRef(socket)
    const [sockState, setSockState] = useState(socket.readyState)
    const waitForConnection = useCallback(function (callback, interval) {

        if (socketRef.current.readyState === 1) {
            console.log("callback")
            callback();
        } else {
            console.log("Timeout")
            // optional: implement backoff for interval here
            setTimeout(function () {
                waitForConnection(callback, interval);
            }, interval);
        }
    }, []);
  const selfId = useRef(v4());
  useEffect(()=>{
      waitForConnection(()=>{setSockState(socket.readyState)}, 200)
  },[waitForConnection])


    return (

    <div className="App">
<AuthApi.Provider value={{selfId: selfId, socketRef: socketRef}}>
      <header className="App-header">
          {((sockState === 1)?(
      <Router>
        <Routes>
            <Route index={true} element={<Home />}></Route>
          <Route exact path='/room/:id' element={<Room/>}/>
        </Routes>
      </Router>
          ):(<div>Подключение к серверу...</div>))}
      </header>
</AuthApi.Provider>
    </div>

  );
}

export default App;
