import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Posts a WhatsApp-style system message into a conversation thread
 * (e.g. "Nurul added Ariful", "Bixxi left"). Rendered as a centered pill,
 * not a normal chat bubble.
 *
 * Must be called *before* the actor removes themselves from the group, or the
 * security rules will reject the write (only members may post messages).
 */
export async function postSystemMessage(conversationId: string, text: string, actorId: string) {
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    kind: 'system',
    text,
    senderId: actorId,
    timestamp: serverTimestamp(),
    readBy: [actorId],
  })
}
