// Re-export Firebase initialization from the main firebase.ts file
import { app, analytics, auth, db } from '../firebase';

export { auth, db, analytics };
export default app;
