import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

interface Setting {
  key: string;
  label: string;
  type: "text" | "textarea" | "image" | "multi-select" | "array" | "pattern" | "bank";
  value: unknown;
  options?: { label: string; value: string }[];
  category: "general" | "academic" | "admission";
  editable: boolean;
  editableReason: string | null;
}

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const [school, studentCount] = await Promise.all([
      prisma.school.findUnique({
        where: { id: req.user.schoolId },
        select: {
          name: true,
          schoolCode: true,
          address: true,
          state: true,
          lga: true,
          logo: true,
          schoolType: true,
          arms: true,
          admissionPattern: true,
          paymentMode: true,
          manualBankDetails: true,
          paystackSurchargePercent: true,
          paystackSurchargeFlat: true,
        },
      }),
      prisma.student.count({ where: { schoolId: req.user.schoolId } }),
    ]);

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const hasStudents = studentCount > 0;

    const settings: Setting[] = [
      {
        key: "schoolName",
        label: "School Name",
        type: "text",
        value: school.name,
        category: "general",
        editable: true,
        editableReason: null,
      },
      {
        key: "address",
        label: "Address",
        type: "textarea",
        value: school.address,
        category: "general",
        editable: true,
        editableReason: null,
      },
      {
        key: "schoolCode",
        label: "School Code",
        type: "text",
        value: school.schoolCode,
        category: "general",
        editable: true,
        editableReason: null,
      },
      {
        key: "state",
        label: "State",
        type: "text",
        value: school.state,
        category: "general",
        editable: true,
        editableReason: null,
      },
      {
        key: "lga",
        label: "LGA",
        type: "text",
        value: school.lga,
        category: "general",
        editable: true,
        editableReason: null,
      },
      {
        key: "logo",
        label: "School Logo",
        type: "image",
        value: school.logo,
        category: "general",
        editable: true,
        editableReason: null,
      },
      {
        key: "schoolType",
        label: "School Type",
        type: "multi-select",
        value: JSON.parse(school.schoolType),
        options: [
          { label: "Creche", value: "creche" },
          { label: "Kindergarten", value: "kg" },
          { label: "Primary", value: "primary" },
          { label: "Junior Secondary", value: "junior-secondary" },
          { label: "Senior Secondary", value: "senior-secondary" },
          { label: "Secondary (legacy)", value: "secondary" },
        ],
        category: "academic",
        editable: !hasStudents,
        editableReason: hasStudents
          ? "Cannot be changed after students have been registered"
          : null,
      },
      {
        key: "arms",
        label: "Class Arms",
        type: "array",
        value: JSON.parse(school.arms),
        category: "academic",
        editable: !hasStudents,
        editableReason: hasStudents
          ? "Cannot be changed after students have been registered"
          : null,
      },
      {
        key: "admissionPattern",
        label: "Admission Number Pattern",
        type: "pattern",
        value: school.admissionPattern,
        category: "admission",
        editable: true,
        editableReason: null,
      },
      {
        key: "paymentMode",
        label: "Payment Mode",
        type: "text",
        value: school.paymentMode,
        category: "academic",
        editable: true,
        editableReason: null,
        options: [
          { label: "Manual (bank transfer, bursar-confirmed)", value: "manual" },
          { label: "Paystack", value: "paystack" },
          { label: "Both", value: "both" },
        ],
      },
      {
        key: "manualBankDetails",
        label: "Manual Bank Details",
        type: "bank",
        value: school.manualBankDetails,
        category: "academic",
        editable: true,
        editableReason: null,
      },
      {
        key: "paystackSurchargePercent",
        label: "Paystack Surcharge (%)",
        type: "text",
        value: school.paystackSurchargePercent,
        category: "academic",
        editable: true,
        editableReason: null,
      },
      {
        key: "paystackSurchargeFlat",
        label: "Paystack Surcharge (₦ flat)",
        type: "text",
        value: school.paystackSurchargeFlat,
        category: "academic",
        editable: true,
        editableReason: null,
      },
    ];

    res.json({ settings });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Get School Settings");
    res.status(errorResponse.status).json(errorResponse);
  }
};
