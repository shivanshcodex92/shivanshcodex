loginBtn.onclick = async () => {
  const uname = username.value.trim();
  const pass = password.value;

  if (!uname || !pass) return alert("Username & password required");

  const fakeEmail = `${uname}@shivanshcodex.local`;

  try {
    await signInWithEmailAndPassword(auth, fakeEmail, pass);
  } catch (e) {
    alert("Wrong username or password");
  }
};

registerBtn.onclick = async () => {
  const uname = username.value.trim();
  const pass = password.value;

  if (!uname || !pass) return alert("Username & password required");

  const fakeEmail = `${uname}@shivanshcodex.local`;

  const cred = await createUserWithEmailAndPassword(auth, fakeEmail, pass);

  await addDoc(collection(db, "users"), {
    uid: cred.user.uid,
    username: uname
  });

  alert("Account created, now login");
};
