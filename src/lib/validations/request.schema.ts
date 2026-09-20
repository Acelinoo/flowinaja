import { RequestPriority } from "@prisma/client";

export interface CommonRequestInput {
  title: string;
  description: string;
  requestTypeId: string;
  priority?: RequestPriority;
}

export interface PurchaseMetadata {
  item: string;
  quantity: number;
  estimatedCost: number;
  justification: string;
}

export interface ITAccessMetadata {
  system: string;
  accessLevel: string;
  justification: string;
}

export interface MaintenanceMetadata {
  location: string;
  issue: string;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  issueDetails: string;
}

export interface BusinessTravelMetadata {
  destination: string;
  travelDate: string;
  returnDate: string;
  purpose: string;
}

export interface GeneralMetadata {
  category?: string;
  details: string;
}

export type RequestMetadata =
  | PurchaseMetadata
  | ITAccessMetadata
  | MaintenanceMetadata
  | BusinessTravelMetadata
  | GeneralMetadata
  | Record<string, unknown>;

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

/**
 * Validates common request fields server-side.
 */
export function validateCommonFields(input: {
  title?: unknown;
  description?: unknown;
  requestTypeId?: unknown;
  priority?: unknown;
}): ValidationResult<CommonRequestInput> {
  const errors: Record<string, string> = {};

  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const requestTypeId = typeof input.requestTypeId === "string" ? input.requestTypeId.trim() : "";
  let priority: RequestPriority = RequestPriority.NORMAL;

  if (!title) {
    errors.title = "Title is required";
  } else if (title.length < 3) {
    errors.title = "Title must be at least 3 characters";
  } else if (title.length > 150) {
    errors.title = "Title must not exceed 150 characters";
  }

  if (!description) {
    errors.description = "Description is required";
  } else if (description.length < 5) {
    errors.description = "Description must be at least 5 characters";
  } else if (description.length > 3000) {
    errors.description = "Description must not exceed 3000 characters";
  }

  if (!requestTypeId) {
    errors.requestTypeId = "Request type must be selected";
  }

  if (input.priority) {
    if (Object.values(RequestPriority).includes(input.priority as RequestPriority)) {
      priority = input.priority as RequestPriority;
    } else {
      errors.priority = "Invalid priority level";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      title,
      description,
      requestTypeId,
      priority,
    },
  };
}

/**
 * Validates request-type-specific metadata based on RequestType code.
 */
export function validateTypeSpecificMetadata(
  typeCode: string | null | undefined,
  metadataInput: Record<string, unknown> = {}
): ValidationResult<RequestMetadata> {
  const errors: Record<string, string> = {};
  const code = (typeCode || "").toUpperCase();

  if (code === "REQ-PUR") {
    const item = typeof metadataInput.item === "string" ? metadataInput.item.trim() : "";
    const quantity = Number(metadataInput.quantity);
    const estimatedCost = Number(metadataInput.estimatedCost);
    const justification = typeof metadataInput.justification === "string" ? metadataInput.justification.trim() : "";

    if (!item || item.length < 2) {
      errors.item = "Item or product name is required (min 2 characters)";
    }
    if (isNaN(quantity) || !Number.isInteger(quantity) || quantity < 1) {
      errors.quantity = "Quantity must be a positive integer (minimum 1)";
    }
    if (isNaN(estimatedCost) || estimatedCost < 0) {
      errors.estimatedCost = "Estimated cost must be a non-negative number";
    }
    if (!justification || justification.length < 5) {
      errors.justification = "Business justification is required (min 5 characters)";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        item,
        quantity,
        estimatedCost,
        justification,
      },
    };
  }

  if (code === "REQ-IT") {
    const system = typeof metadataInput.system === "string" ? metadataInput.system.trim() : "";
    const accessLevel = typeof metadataInput.accessLevel === "string" ? metadataInput.accessLevel.trim() : "";
    const justification = typeof metadataInput.justification === "string" ? metadataInput.justification.trim() : "";

    if (!system || system.length < 2) {
      errors.system = "Target system or application is required";
    }
    if (!accessLevel) {
      errors.accessLevel = "Access level privilege is required";
    }
    if (!justification || justification.length < 5) {
      errors.justification = "Access justification is required (min 5 characters)";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        system,
        accessLevel,
        justification,
      },
    };
  }

  if (code === "REQ-MNT") {
    const location = typeof metadataInput.location === "string" ? metadataInput.location.trim() : "";
    const issue = typeof metadataInput.issue === "string" ? metadataInput.issue.trim() : "";
    const urgency = typeof metadataInput.urgency === "string" ? metadataInput.urgency.trim() : "MEDIUM";
    const issueDetails = typeof metadataInput.issueDetails === "string" ? metadataInput.issueDetails.trim() : "";

    if (!location || location.length < 2) {
      errors.location = "Facility location or room is required";
    }
    if (!issue || issue.length < 3) {
      errors.issue = "Issue summary is required";
    }
    if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(urgency)) {
      errors.urgency = "Urgency must be LOW, MEDIUM, HIGH, or CRITICAL";
    }
    if (!issueDetails || issueDetails.length < 5) {
      errors.issueDetails = "Specific maintenance details are required (min 5 characters)";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        location,
        issue,
        urgency: urgency as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        issueDetails,
      },
    };
  }

  if (code === "REQ-TRV") {
    const destination = typeof metadataInput.destination === "string" ? metadataInput.destination.trim() : "";
    const travelDate = typeof metadataInput.travelDate === "string" ? metadataInput.travelDate.trim() : "";
    const returnDate = typeof metadataInput.returnDate === "string" ? metadataInput.returnDate.trim() : "";
    const purpose = typeof metadataInput.purpose === "string" ? metadataInput.purpose.trim() : "";

    if (!destination || destination.length < 2) {
      errors.destination = "Travel destination is required";
    }
    if (!travelDate || isNaN(Date.parse(travelDate))) {
      errors.travelDate = "Valid travel departure date is required";
    }
    if (!returnDate || isNaN(Date.parse(returnDate))) {
      errors.returnDate = "Valid return date is required";
    } else if (travelDate && new Date(returnDate) < new Date(travelDate)) {
      errors.returnDate = "Return date cannot be earlier than departure date";
    }
    if (!purpose || purpose.length < 5) {
      errors.purpose = "Travel purpose is required (min 5 characters)";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        destination,
        travelDate,
        returnDate,
        purpose,
      },
    };
  }

  if (code === "REQ-GEN") {
    const category = typeof metadataInput.category === "string" ? metadataInput.category.trim() : "General";
    const details = typeof metadataInput.details === "string" ? metadataInput.details.trim() : "";

    if (!details || details.length < 5) {
      errors.details = "Operational request details are required (min 5 characters)";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        category: category || "General",
        details,
      },
    };
  }

  // If no known code, allow plain object
  return {
    success: true,
    data: metadataInput,
  };
}
