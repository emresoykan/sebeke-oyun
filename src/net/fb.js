// --- Firebase bağlantısı (arkadaş ligi ve bulut kayıt) ---
// SDK yalnızca oyuncu bir lige katıldığında ya da bulut kaydı açtığında yüklenir (ayrı parça), böylece kullanmayanlar için sayfa ağırlaşmaz.
// Giriş anonimdir: tarayıcı başına kalıcı bir kimlik (uid) oluşur; e-posta veya şifre istenmez.
let api=null;

export async function connect(cfg,emu){
  if(api)return api;
  const [{initializeApp},A,F]=await Promise.all([import("firebase/app"),import("firebase/auth"),import("firebase/firestore")]);
  const app=initializeApp(cfg),auth=A.getAuth(app),db=F.getFirestore(app);
  if(emu){A.connectAuthEmulator(auth,`http://${emu}:9099`,{disableWarnings:true});F.connectFirestoreEmulator(db,emu,8080);}
  await auth.authStateReady();
  const user=auth.currentUser||(await A.signInAnonymously(auth)).user;
  const pl=code=>F.collection(db,"leagues",code,"players"),fd=code=>F.collection(db,"leagues",code,"feed");
  const rows=s=>s.docs.map(x=>{const d=x.data({serverTimestamps:"estimate"});return {...d,id:x.id,at:d.at&&d.at.toMillis?d.at.toMillis():Date.now()};});
  api={
    uid:user.uid,
    upsert:(code,d)=>F.setDoc(F.doc(pl(code),user.uid),{...d,at:F.serverTimestamp()}),
    post:(code,d)=>F.addDoc(fd(code),{...d,uid:user.uid,at:F.serverTimestamp()}),
    leave:code=>F.deleteDoc(F.doc(pl(code),user.uid)),
    watchPlayers:(code,cb,err)=>F.onSnapshot(F.query(pl(code),F.orderBy("v","desc"),F.limit(25)),s=>cb(rows(s)),err),
    watchFeed:(code,cb,err)=>F.onSnapshot(F.query(fd(code),F.orderBy("at","desc"),F.limit(20)),s=>cb(rows(s)),err),
    // bulut kayıt (saves/{kurtarma kodu})
    saveGet:async code=>{const d=await F.getDoc(F.doc(db,"saves",code));if(!d.exists())return null;const x=d.data({serverTimestamps:"estimate"});return {...x,at:x.at&&x.at.toMillis?x.at.toMillis():null};},
    savePut:(code,d)=>F.setDoc(F.doc(db,"saves",code),{...d,at:F.serverTimestamp()}),
    saveDel:code=>F.deleteDoc(F.doc(db,"saves",code))
  };
  return api;
}
