/** Plain data (no server-only imports) so the Better Auth CLI can read it. */
export const pairingSchema = {
  pairing: {
    fields: {
      userCode: { type: "string", required: true, unique: true },
      secretHash: { type: "string", required: true },
      status: { type: "string", required: true },
      userId: { type: "string", required: false },
      requesterUa: { type: "string", required: false },
      requesterGeo: { type: "string", required: false },
      expiresAt: { type: "date", required: true },
      createdAt: { type: "date", required: true },
    },
  },
} as const;
