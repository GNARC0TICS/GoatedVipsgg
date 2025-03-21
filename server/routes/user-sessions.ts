import { Router } from "express";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Mock data for sessions
const mockSessions = [
  {
    id: 1,
    userId: 1,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    ipAddress: "127.0.0.1",
    lastActive: new Date().toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    userId: 1,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
    ipAddress: "192.168.1.1",
    lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: false,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Get all sessions for the current user
router.get("/api/user/sessions", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }
    
    // Return mock data for now
    const sessions = mockSessions.filter(session => session.userId === userId);
    
    return res.json(sessions);
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// Terminate a session
router.post("/api/user/sessions/:sessionId/terminate", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = parseInt(req.params.sessionId);
    
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }
    
    // Find the session in mock data
    const sessionIndex = mockSessions.findIndex(
      session => session.id === sessionId && session.userId === userId
    );
    
    if (sessionIndex === -1) {
      return res.status(404).json({
        status: "error",
        message: "Session not found",
      });
    }
    
    // Don't allow terminating the current session
    if (mockSessions[sessionIndex].isActive) {
      return res.status(400).json({
        status: "error",
        message: "Cannot terminate the current session",
      });
    }
    
    // Update the session in mock data
    mockSessions[sessionIndex].isActive = false;
    
    return res.json({
      status: "success",
      message: "Session terminated successfully",
    });
  } catch (error) {
    console.error("Error terminating session:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default router;
