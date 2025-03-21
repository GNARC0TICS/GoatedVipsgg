
import { Router } from 'express';
import { sendConfirmationEmail } from '../utils/email';

const router = Router();

router.post('/test-email', async (req, res) => {
  try {
    await sendConfirmationEmail(req.body.email, 'Test User');
    res.json({ success: true, message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Email test failed:', error);
    res.status(500).json({ success: false, message: 'Failed to send test email' });
  }
});

export default router;
