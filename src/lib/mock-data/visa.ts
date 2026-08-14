import type { VisaGuide } from "@/lib/domain/types";

/**
 * Advisory-only examples. Fees and eligibility change, so every record keeps
 * a verification timestamp and sends travellers to Pakistan's official POVS.
 */
export const visaGuides: VisaGuide[] = [
  {
    id: "visa-us",
    nationalityCode: "US",
    evisaAvailable: true,
    visaFreeStay: false,
    feeUsdMin: 20,
    feeUsdMax: 60,
    processingDaysMin: 7,
    processingDaysMax: 20,
    notes:
      "Apply through the Pakistan Online Visa System. Use this as a planning estimate only and allow 4–6 weeks before travel.",
    officialLink: "https://visa.nadra.gov.pk/",
    lastVerifiedAt: "2026-07-15T00:00:00.000Z",
  },
  {
    id: "visa-gb",
    nationalityCode: "GB",
    evisaAvailable: true,
    visaFreeStay: false,
    feeUsdMin: 20,
    feeUsdMax: 60,
    processingDaysMin: 7,
    processingDaysMax: 20,
    notes:
      "Apply through the Pakistan Online Visa System. Confirm current fee, entry type and supporting-document requirements with the official portal.",
    officialLink: "https://visa.nadra.gov.pk/",
    lastVerifiedAt: "2026-07-15T00:00:00.000Z",
  },
  {
    id: "visa-ae",
    nationalityCode: "AE",
    evisaAvailable: true,
    visaFreeStay: false,
    feeUsdMin: 0,
    feeUsdMax: 0,
    processingDaysMin: 7,
    processingDaysMax: 20,
    notes:
      "Fee-exemption and visa policy can change. Confirm eligibility and submit any required application through the official Pakistan Online Visa System.",
    officialLink: "https://visa.nadra.gov.pk/",
    lastVerifiedAt: "2026-07-15T00:00:00.000Z",
  },
  {
    id: "visa-cn",
    nationalityCode: "CN",
    evisaAvailable: true,
    visaFreeStay: true,
    feeUsdMin: 0,
    feeUsdMax: 0,
    processingDaysMin: 0,
    processingDaysMax: 0,
    notes:
      "The mock record reflects a short visa-free stay example. Confirm current entry conditions, eligible passport type and permitted stay directly with the official portal before booking travel.",
    officialLink: "https://visa.nadra.gov.pk/",
    lastVerifiedAt: "2026-07-15T00:00:00.000Z",
  },
  {
    id: "visa-pk",
    nationalityCode: "PK",
    evisaAvailable: false,
    visaFreeStay: true,
    feeUsdMin: 0,
    feeUsdMax: 0,
    processingDaysMin: 0,
    processingDaysMax: 0,
    notes: "Pakistani citizens do not need a visitor visa to enter Pakistan.",
    officialLink: "https://visa.nadra.gov.pk/",
    lastVerifiedAt: "2026-07-15T00:00:00.000Z",
  },
];
