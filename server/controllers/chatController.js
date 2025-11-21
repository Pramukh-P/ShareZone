import { Zone } from "../models/Zone.js";
import { ChatMessage } from "../models/ChatMessage.js";

export const getZoneChat = async (req, res) => {
  try {
    const { id } = req.params;

    const zone = await Zone.findById(id);
    if (!zone || zone.isDeleted) {
      return res.status(404).json({ message: "Zone not found" });
    }

    if (zone.expiresAt < new Date()) {
      return res.status(410).json({ message: "Zone has expired" });
    }

    const messages = await ChatMessage.find({ zone: zone._id })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    return res.json(
      messages.map((m) => ({
        id: m._id,
        username: m.username,
        text: m.text,
        createdAt: m.createdAt,
      }))
    );
  } catch (err) {
    console.error("Error getting chat:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
