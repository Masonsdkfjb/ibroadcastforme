import React, { useState, useEffect, useRef } from "react";
import { collection, addDoc, doc, setDoc, getDoc } from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, provider, db } from "./firebase";
import { parseBlob } from "music-metadata-browser";

const CLOUDINARY_UPLOAD_PRESET = "unsigned_school_preset";
const CLOUDINARY_CLOUD_NAME = "dkw0qnlta";

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("student");
  const [audioList, setAudioList] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [note, setNote] = useState("");
  const audioRef = useRef(null);
  const [playbackPos, setPlaybackPos] = useState(0);

  useEffect(() => {
    onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setUserRole(
          currentUser.email === "facsaudiobooks@gracesystem.org"
            ? "admin"
            : "student"
        );
        await loadAudioList();
      } else {
        setAudioList([]);
        setSelectedAudio(null);
      }
    });
  }, []);

  async function loadAudioList() {
    try {
      const res = await fetch("http://localhost:4000/api/audio");
      const data = await res.json();

      // Fix: assign safe ID (no URLs)
      const fixedData = data.map((audio, index) => ({
        ...audio,
        id: audio.id || `audio-${index}`, // NO URL fallback here!
      }));

      setAudioList(fixedData);
    } catch (error) {
      console.error("Failed to fetch audio list from backend:", error);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    let metadata = null;
    try {
      metadata = await parseBlob(file);
    } catch (error) {
      console.error("Failed to parse metadata:", error);
    }

    const { title, artist } = metadata?.common || {};
    const duration = metadata?.format?.duration || 0;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
      { method: "POST", body: formData }
    );
    const data = await res.json();

    const audioData = {
      title: title || file.name,
      artist: artist || "Unknown Artist",
      duration,
      url: data.secure_url,
      uploadedBy: user.uid,
    };

    await addDoc(collection(db, "audio"), audioData);
    await loadAudioList();
  }

  useEffect(() => {
    async function loadUserData() {
      if (!user || !selectedAudio) return;

      // Use only safe IDs here (no URLs)
      const noteRef = doc(db, "users", user.uid, "notes", selectedAudio.id);
      const noteSnap = await getDoc(noteRef);
      setNote(noteSnap.exists() ? noteSnap.data().text : "");

      const posRef = doc(db, "users", user.uid, "progress", selectedAudio.id);
      const posSnap = await getDoc(posRef);
      setPlaybackPos(posSnap.exists() ? posSnap.data().lastPosition : 0);
    }
    loadUserData();
  }, [user, selectedAudio]);

  async function saveNote() {
    if (!user || !selectedAudio) return;
    const noteRef = doc(db, "users", user.uid, "notes", selectedAudio.id);
    await setDoc(noteRef, { text: note });
    alert("Note saved!");
  }

  function onTimeUpdate() {
    if (!user || !selectedAudio) return;
    if (!audioRef.current) return;

    const currentTime = audioRef.current.currentTime;
    if (Math.floor(currentTime) % 5 === 0) {
      const posRef = doc(db, "users", user.uid, "progress", selectedAudio.id);
      setDoc(posRef, { lastPosition: currentTime });
    }
  }

  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  useEffect(() => {
    if (audioRef.current && playbackPos > 0) {
      audioRef.current.currentTime = playbackPos;
    }
  }, [playbackPos, selectedAudio]);

  return (
    <div style={{ padding: 20 }}>
      <h1>School iBroadcast Clone</h1>
      {!user ? (
        <button onClick={login}>Login with Google</button>
      ) : (
        <>
          <p>
            Logged in as: {user.email} ({userRole})
            <button onClick={logout} style={{ marginLeft: 10 }}>
              Logout
            </button>
          </p>

          {userRole === "admin" && (
            <div>
              <h3>Upload Audio</h3>
              <input type="file" accept="audio/*" onChange={handleUpload} />
            </div>
          )}

          <h3>Audio List</h3>
          <ul>
            {audioList
              .filter((audio) => audio.url)
              .map((audio) => (
                <li key={audio.id} style={{ marginBottom: 10 }}>
                  <button onClick={() => setSelectedAudio(audio)}>
                    {audio.title} - {audio.artist}
                  </button>
                </li>
              ))}
            {audioList.some((audio) => !audio.url) && (
              <li style={{ color: "red" }}>
                Some audio files have missing URLs and are not shown.
              </li>
            )}
          </ul>

          {selectedAudio && (
            <div>
              <h3>Now Playing: {selectedAudio.title}</h3>
              <audio
                ref={audioRef}
                controls
                src={selectedAudio.url}
                onTimeUpdate={onTimeUpdate}
                style={{ width: "100%" }}
              />

              <h4>Your Notes:</h4>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                cols={50}
              />
              <br />
              <button onClick={saveNote}>Save Note</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
