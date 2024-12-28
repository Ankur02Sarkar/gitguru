// Import the functions you need from the SDKs you need
import { rejects } from "assert";
import { resolve } from "path";
import { initializeApp } from "firebase/app";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { Download } from "lucide-react";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY!,
  authDomain: "gitguru-3a69b.firebaseapp.com",
  projectId: "gitguru-3a69b",
  storageBucket: "gitguru-3a69b.firebasestorage.app",
  messagingSenderId: "916366962465",
  appId: "1:916366962465:web:8f1edf189236371760d860",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const storage = getStorage(app);

export async function uploadFile(
  file: File,
  setProgress?: (progress: number) => void,
) {
  return new Promise((resolve, reject) => {
    try {
      const storageRef = ref(storage, file.name);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
          );
          if (setProgress) {
            setProgress(progress);
            switch (snapshot.state) {
              case "paused":
                console.log("Upload is paused");
                break;
              case "running":
                console.log("Upload is running");
                break;
            }
          }
        },
        (error) => {
          reject(error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((DownloadUrl) => {
            resolve(DownloadUrl as string);
          });
        },
      );
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
}
