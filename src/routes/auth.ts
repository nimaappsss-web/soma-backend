import { Router } from "express";
import {
  registerPrincipal,
  registerSchool,
  login,
  refresh,
  logout,
  me,
  inviteTeacher,
  bulkInviteTeachers,
  acceptInvite,
  sendOTP,
  verifyOTP,
  verifyEmailOtp,
  forgotPassword,
  resetPassword,
} from "../controllers/authController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * /api/auth/register-principal:
 *   post:
 *     summary: Step 1 - Register a principal (without school)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [principalName, principalPhone, password]
 *             properties:
 *               principalName:
 *                 type: string
 *               principalEmail:
 *                 type: string
 *               principalPhone:
 *                 type: string
 *               password:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Principal registered successfully
 */
router.post("/register-principal", registerPrincipal);

/**
 * @swagger
 * /api/auth/register-school:
 *   post:
 *     summary: Step 2 - Register a school (authenticated principal)
 *     tags: [School]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [schoolName, state, lga, schoolType]
 *             properties:
 *               schoolName:
 *                 type: string
 *               state:
 *                 type: string
 *               lga:
 *                 type: string
 *               schoolType:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: School registered successfully
 */
router.post("/register-school", authenticateToken, registerSchool);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       403:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/refresh", refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post("/logout", logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/me", authenticateToken, me);

/**
 * @swagger
 * /api/auth/invite-teacher:
 *   post:
 *     summary: Invite a teacher to the school (Principal only)
 *     tags: [Teacher Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [teacherName, teacherEmail]
 *             properties:
 *               teacherName:
 *                 type: string
 *                 example: Mrs. Chioma Nwosu
 *               teacherEmail:
 *                 type: string
 *                 example: teacher@greenfield.sch.ng
 *               teacherPhone:
 *                 type: string
 *                 example: "08098765432"
 *               role:
 *                 type: string
 *                 enum: [TEACHER, BURSAR]
 *                 example: TEACHER
 *     responses:
 *       201:
 *         description: Teacher invited successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only principals can invite teachers
 */
router.post("/invite-teacher", authenticateToken, inviteTeacher);

/**
 * @swagger
 * /api/auth/accept-invite:
 *   post:
 *     summary: Accept teacher invitation and set password
 *     tags: [Teacher Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password, deviceId, deviceName]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 example: SecurePass123
 *               deviceId:
 *                 type: string
 *                 example: device-002
 *               deviceName:
 *                 type: string
 *                 example: Chrome Browser
 *     responses:
 *       200:
 *         description: Invite accepted successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post("/accept-invite", acceptInvite);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset link
 *     tags: [Password Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: principal@greenfield.sch.ng
 *     responses:
 *       200:
 *         description: Password reset link sent (if email exists)
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Password Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 example: NewSecurePass123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password", resetPassword);

/**
 * @swagger
 * /api/auth/bulk-invite:
 *   post:
 *     summary: Invite multiple teachers at once
 *     tags: [Teacher Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [teachers]
 *             properties:
 *               teachers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     teacherName:
 *                       type: string
 *                     teacherPhone:
 *                       type: string
 *                     role:
 *                       type: string
 *     responses:
 *       201:
 *         description: Bulk invites created
 */
router.post("/bulk-invite", authenticateToken, bulkInviteTeachers);

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP to phone number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "08012345678"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post("/send-otp", sendOTP);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code, deviceId, deviceName]
 *             properties:
 *               phone:
 *                 type: string
 *               code:
 *                 type: string
 *               deviceId:
 *                 type: string
 *               deviceName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/verify-otp", verifyOTP);

/**
 * @swagger
 * /api/auth/verify-email-otp:
 *   post:
 *     summary: Verify email OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code, password, deviceId, deviceName]
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *               password:
 *                 type: string
 *               deviceId:
 *                 type: string
 *               deviceName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified and account activated
 */
router.post("/verify-email-otp", verifyEmailOtp);

export default router;
