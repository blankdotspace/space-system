import neynar from "@/common/data/api/neynar";
import requestHandler from "@/common/data/api/requestHandler";
import { isAxiosError } from "axios";
import { NextApiRequest, NextApiResponse } from "next";

async function publishMessage(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  try {
    const message = req.body;
    const messageType = message.data?.type;
    
    // Create a copy of the message to avoid mutating the original
    const cleanMessage = { ...message };
    
    // For reaction messages, validate required fields
    if (messageType === "MESSAGE_TYPE_REACTION_ADD" || messageType === "MESSAGE_TYPE_REACTION_REMOVE") {
      // Validate signer is present (but don't modify it - it's part of the signed message)
      if (!cleanMessage.signer) {
        console.error('[publishMessage] Signer field is missing for reaction message');
        throw new Error('Signer field is required for reaction messages');
      }
      
      // This conversion should be safe as it's just a format change, not a value change
      if (Array.isArray(cleanMessage.signer)) {
        const buffer = Buffer.from(cleanMessage.signer);
        cleanMessage.signer = `0x${buffer.toString('hex')}`;
        console.log('[publishMessage] Converted signer from array to hex');
      } else if (typeof cleanMessage.signer === 'string' && !cleanMessage.signer.startsWith('0x')) {
        // If it's a string but not hex, try to convert
        if (/^[0-9a-fA-F]+$/.test(cleanMessage.signer)) {
          cleanMessage.signer = `0x${cleanMessage.signer.toLowerCase()}`;
          console.log('[publishMessage] Added 0x prefix to signer');
        }
      }
      
      // Ensure signerScheme is set
      if (!cleanMessage.signerScheme && cleanMessage.signatureScheme !== undefined) {
        cleanMessage.signerScheme = cleanMessage.signatureScheme;
      }
    }
    
    // This field is not part of the signature, so it's safe to remove
    delete cleanMessage.dataBytes;
    
    const response = await neynar.publishMessageToFarcaster({body: cleanMessage});
    
    const totalDuration = Date.now() - startTime;
    if (totalDuration > 5000) {
      console.log(`[publishMessage] Slow request: ${totalDuration}ms for type ${messageType}`);
    }
    
    res.status(200).json(response);
  } catch (e: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[publishMessage] Error after ${totalDuration}ms:`, e);
    
    if (isAxiosError(e)) {
      const errorData = e.response?.data || e.message;
      console.error('[publishMessage] Axios error details:', {
        status: e.response?.status,
        statusText: e.response?.statusText,
        code: e.code,
      });
      res.status(e.response?.status || 500).json(errorData);
    } else {
      res.status(500).json({ error: e.message || "Unknown error occurred" });
    }
  }
}

export default requestHandler({
  post: publishMessage,
});
