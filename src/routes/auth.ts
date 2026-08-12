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
  inviteInfo,
  acceptInvite,
  sendOTP,
  verifyOTP,
  verifyEmailOtp,
  forgotPassword,
  resetPassword,
  completeRegistration,
  acceptParentInvite,
  updateProfile,
  verifyLoginOtp,
  checkIdentifier,
  startRegistration,
  verifyRegistrationOtp,
  completeProfile,
  googleAuth,
  changePassword,
  setPassword,
  generateInviteLink,
} from "../controllers/authController";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import {
  loginLimiter,
  sendOtpLimiter,
  verifyOtpLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  registerPrincipalLimiter,
  inviteTeacherLimiter,
  bulkInviteLimiter,
} from "../middleware/rateLimiter";

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
router.post("/start-registration", sendOtpLimiter, startRegistration);

/**
 * @swagger
 * /api/auth/verify-registration-otp:
 *   post:
 *     summary: Verify email OTP during registration (returns registration token)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified
 */
router.post("/verify-registration-otp", verifyRegistrationOtp);

/**
 * @swagger
 * /api/auth/complete-profile:
 *   post:
 *     summary: Complete profile after email verification (creates user, returns tokens)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [registrationToken, name, phone, password]
 *             properties:
 *               registrationToken:
 *                 type: string
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Profile created, tokens returned
 */
router.post("/complete-profile", completeProfile);

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Sign up or log in with Google
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *               deviceId:
 *                 type: string
 *               deviceName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       201:
 *         description: Account created
 */
router.post("/google", googleAuth);

router.post("/register-principal", registerPrincipalLimiter, registerPrincipal);

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
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [creche, kg, primary, junior-secondary, senior-secondary, secondary]
 *               logoUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: School registered successfully
 */
router.post("/register-school", authenticateToken, requireAdmin(), registerSchool);

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
router.post("/check-identifier", checkIdentifier);
router.post("/login", loginLimiter, login);

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
router.patch("/me", authenticateToken, updateProfile);

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
router.post("/invite-teacher", authenticateToken, requireAdmin(), inviteTeacherLimiter, inviteTeacher);

/**
 * @swagger
 * /api/auth/invite-info:
 *   get:
 *     summary: Get school info + subjects + classes for an invite token
 *     tags: [Teacher Management]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: School, subjects, and classes
 *       404:
 *         description: Invalid token
 */
router.get("/invite-info", inviteInfo);

/**
 * @swagger
 * /api/auth/accept-invite:
 *   post:
 *     summary: Accept teacher invitation (click from email link)
 *     tags: [Teacher Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, name, password]
 *             properties:
 *               token:
 *                 type: string
 *               name:
 *                 type: string
 *                 example: Mr. Adeyemi
 *               password:
 *                 type: string
 *                 example: SecurePass123
 *               assignments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     subjectId:
 *                       type: string
 *                     classIds:
 *                       type: array
 *                       items:
 *                         type: string
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post("/accept-invite", acceptInvite);

/**
 * @swagger
 * /api/auth/accept-parent-invite:
 *   post:
 *     summary: Accept parent invite and set password
 *     tags: [Authentication]
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
 *     responses:
 *       201:
 *         description: Parent account set up successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post("/accept-parent-invite", acceptParentInvite);

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
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

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
router.post("/reset-password", resetPasswordLimiter, resetPassword);

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
router.post("/bulk-invite", authenticateToken, requireAdmin(), bulkInviteLimiter, bulkInviteTeachers);

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
router.post("/send-otp", sendOtpLimiter, sendOTP);

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
router.post("/verify-otp", verifyOtpLimiter, verifyOTP);

/**
 * @swagger
 * /api/auth/verify-email-otp:
 *   post:
 *     summary: Verify email OTP and login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *               deviceId:
 *                 type: string
 *               deviceName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified, returns user + tokens
 */
router.post("/verify-email-otp", verifyOtpLimiter, verifyEmailOtp);

/**
 * @swagger
 * /api/auth/verify-login-otp:
 *   post:
 *     summary: Verify OTP and login (returns tokens + user data like password login)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, code, deviceId]
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email or phone number
 *               code:
 *                 type: string
 *                 description: 6-digit OTP code
 *               deviceId:
 *                 type: string
 *               deviceName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns user + tokens
 */
router.post("/verify-login-otp", verifyOtpLimiter, verifyLoginOtp);

/**
 * @swagger
 * /api/auth/complete-registration:
 *   post:
 *     summary: Complete teacher registration (set name, password, and assignments)
 *     tags: [Teacher Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Mr. Adeyemi
 *               password:
 *                 type: string
 *                 example: SecurePass123
 *               assignments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     subjectId:
 *                       type: string
 *                       nullable: true
 *                       description: null for form teacher
 *                     classIds:
 *                       type: array
 *                       items:
 *                         type: string
 *     responses:
 *       200:
 *         description: Registration completed
 *       400:
 *         description: Validation error
 */
router.post("/complete-registration", authenticateToken, completeRegistration);

router.post("/change-password", authenticateToken, changePassword);
router.post("/set-password", authenticateToken, setPassword);

router.post("/generate-invite-link", authenticateToken, requireAdmin(), generateInviteLink);

export default router;
