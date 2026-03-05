// const QuickInspection = require("../../models/InspectionCompany/QuickInspection");

// const validateServices = services => {
//   if (!services) return false;

//   const list = ["psi", "loading", "stuffing"];

//   return list.some(
//     s => services[s] && services[s].confirmed && services[s].confirmed !== ""
//   );
// };

// const validateAvailability = availability =>
//   Array.isArray(availability) && availability.length > 0;

// const validateRegions = regions => {
//   if (!Array.isArray(regions) || regions.length === 0) return false;

//   for (const region of regions) {
//     if (!region.locations || region.locations.length === 0) return false;

//     for (const loc of region.locations) {
//       if (!validateServices(loc.services)) return false;
//       if (!validateAvailability(loc.availability)) return false;
//     }
//   }

//   return true;
// };

// exports.saveQuickInspectionController = async (req, res) => {
//   try {
//     const {
//       coverageType,
//       indiaRegions,
//       intlRegions,
//       commodities,
//       description,
//       removeLocationIds = []
//     } = req.body;

//     if (!coverageType)
//       return res.status(400).json({ message: "Coverage type required" });

//     const activeRegions =
//       coverageType === "india" ? indiaRegions : intlRegions;

//     if (!validateRegions(activeRegions)) {
//       return res.status(400).json({
//         message: "Locations, services, and availability are mandatory"
//       });
//     }

//     if (!Array.isArray(commodities) || commodities.length === 0) {
//       return res.status(400).json({
//         message: "At least one commodity required"
//       });
//     }

//     if (!description || description.trim() === "") {
//       return res.status(400).json({
//         message: "Description required"
//       });
//     }

//     let doc = await QuickInspection.findOne({ company: req.user._id });

//     if (!doc) {
//       doc = new QuickInspection({
//         company: req.user._id,
//         coverageType,
//         indiaRegions: indiaRegions || [],
//         intlRegions: intlRegions || [],
//         commodities,
//         description
//       });
//     } else {
//       const mergeRegions = (existing = [], incoming = []) => {
//         const map = new Map();

//         existing.forEach(r => map.set(r.name, r));

//         incoming.forEach(r => {
//           if (!map.has(r.name)) {
//             map.set(r.name, r);
//           } else {
//             const region = map.get(r.name);
//             region.locations.push(...r.locations);
//           }
//         });

//         return Array.from(map.values());
//       };

//       doc.coverageType = coverageType;
//       doc.indiaRegions = mergeRegions(doc.indiaRegions, indiaRegions);
//       doc.intlRegions = mergeRegions(doc.intlRegions, intlRegions);
//       doc.commodities = commodities;
//       doc.description = description;

//       if (removeLocationIds.length > 0) {
//         const removeFromRegions = regions =>
//           regions.map(region => ({
//             ...region.toObject(),
//             locations: region.locations.filter(
//               loc => !removeLocationIds.includes(String(loc._id))
//             )
//           }));

//         doc.indiaRegions = removeFromRegions(doc.indiaRegions);
//         doc.intlRegions = removeFromRegions(doc.intlRegions);
//       }
//     }

//     await doc.save();

//     return res.status(201).json({
//       success: true,
//       message: "Saved successfully",
//       data: doc
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: err.message
//     });
//   }
// };

// exports.getQuickInspectionController = async (req, res) => {
//   try {
//     const { companyId } = req.params;

//     const data = await QuickInspection.findOne({ company: companyId });

//     if (!data) {
//       return res.status(404).json({
//         success: false,
//         message: "Quick inspection not found"
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: err.message
//     });
//   }
// };

// exports.removeLocationController = async (req, res) => {
//   try {
//     const { docId, locationId } = req.params;

//     const doc = await QuickInspection.findById(docId);
//     if (!doc) return res.status(404).json({ success: false });

//     const cleanRegions = regions => {
//       return regions
//         .map(region => {
//           region.locations = region.locations.filter(
//             loc => loc._id.toString() !== locationId
//           );
//           return region;
//         })
//         .filter(region => region.locations.length > 0);
//     };

//     doc.indiaRegions = cleanRegions(doc.indiaRegions || []);
//     doc.intlRegions = cleanRegions(doc.intlRegions || []);

//     doc.markModified("indiaRegions");
//     doc.markModified("intlRegions");

//     await doc.save();

//     return res.status(200).json({ success: true });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ success: false });
//   }
// };

// exports.getMarketplaceCompaniesController = async (req, res) => {
//   try {
//     const quickInspections = await QuickInspection.find() 
//       .populate("company", "companyName companyEmail");
//     return res.json({ success: true, quickInspections });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch marketplace companies",
//       error: err.message,
//     });
//   }
// }; 





const QuickInspection = require("../../models/InspectionCompany/QuickInspection");

const PLATFORM_MARGIN = 0.45;

const validateServices = (services) => {
  if (!services) return false;
  return ["psi", "loading", "stuffing"].some(
    (s) => services[s] && services[s].confirmed && services[s].confirmed !== ""
  );
};

const validateAvailability = (availability) =>
  Array.isArray(availability) && availability.length > 0;

const validateRegions = (regions) => {
  if (!Array.isArray(regions) || regions.length === 0) return false;
  for (const region of regions) {
    if (!region.locations || region.locations.length === 0) return false;
    for (const loc of region.locations) {
      if (!validateServices(loc.services)) return false;
      if (!validateAvailability(loc.availability)) return false;
    }
  }
  return true;
};

const mergeRegions = (existing = [], incoming = []) => {
  const map = new Map();
  existing.forEach((r) => map.set(r.name, { ...r.toObject(), locations: [...r.toObject().locations] }));
  incoming.forEach((r) => {
    if (!map.has(r.name)) {
      map.set(r.name, r);
    } else {
      const region = map.get(r.name);
      region.locations.push(...r.locations);
    }
  });
  return Array.from(map.values());
};

exports.saveQuickInspectionController = async (req, res) => {
  try {
    const {
      coverageType,
      indiaRegions,
      intlRegions,
      commodities,
      description,
      removeLocationIds = []
    } = req.body;

    if (!coverageType)
      return res.status(400).json({ message: "Coverage type required" });

    const activeRegions = coverageType === "india" ? indiaRegions : intlRegions;

    if (!validateRegions(activeRegions)) {
      return res.status(400).json({
        message: "Locations, services, and availability are mandatory"
      });
    }

    if (!Array.isArray(commodities) || commodities.length === 0) {
      return res.status(400).json({ message: "At least one commodity required" });
    }

    let doc = await QuickInspection.findOne({ company: req.user._id });

    if (!doc) {
      if (!description || description.trim() === "") {
        return res.status(400).json({ message: "Description required for first setup" });
      }
      doc = new QuickInspection({
        company: req.user._id,
        coverageType,
        indiaRegions: indiaRegions || [],
        intlRegions: intlRegions || [],
        commodities,
        description
      });
    } else {
      doc.coverageType = coverageType;
      doc.indiaRegions = mergeRegions(doc.indiaRegions, indiaRegions || []);
      doc.intlRegions = mergeRegions(doc.intlRegions, intlRegions || []);

      const merged = Array.from(new Set([...doc.commodities, ...commodities]));
      doc.commodities = merged;

      if (description && description.trim() !== "") {
        doc.description = description.trim();
      }

      if (removeLocationIds.length > 0) {
        const removeFrom = (regions) =>
          regions.map((region) => ({
            ...region.toObject(),
            locations: region.toObject
              ? region.toObject().locations.filter(
                  (loc) => !removeLocationIds.includes(String(loc._id))
                )
              : region.locations.filter(
                  (loc) => !removeLocationIds.includes(String(loc._id))
                )
          }));
        doc.indiaRegions = removeFrom(doc.indiaRegions);
        doc.intlRegions = removeFrom(doc.intlRegions);
      }

      doc.markModified("indiaRegions");
      doc.markModified("intlRegions");
      doc.markModified("commodities");
    }

    await doc.save();

    return res.status(201).json({ success: true, message: "Saved successfully", data: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

exports.getQuickInspectionController = async (req, res) => {
  try {
    const { companyId } = req.params;
    const data = await QuickInspection.findOne({ company: companyId });
    if (!data) return res.status(404).json({ success: false, message: "Not found" });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

exports.removeLocationController = async (req, res) => {
  try {
    const { docId, locationId } = req.params;
    const doc = await QuickInspection.findById(docId);
    if (!doc) return res.status(404).json({ success: false });

    const cleanRegions = (regions) =>
      regions
        .map((region) => {
          region.locations = region.locations.filter(
            (loc) => loc._id.toString() !== locationId
          );
          return region;
        })
        .filter((region) => region.locations.length > 0);

    doc.indiaRegions = cleanRegions(doc.indiaRegions || []);
    doc.intlRegions = cleanRegions(doc.intlRegions || []);
    doc.markModified("indiaRegions");
    doc.markModified("intlRegions");
    await doc.save();

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

exports.getMarketplaceCompaniesController = async (req, res) => {
  try {
    const quickInspections = await QuickInspection.find().populate(
      "company",
      "companyName companyEmail"
    );

    const withMargin = quickInspections.map((q) => {
      const applyMargin = (regions) =>
        regions.map((region) => ({
          ...region.toObject(),
          locations: region.toObject().locations.map((loc) => ({
            ...loc,
            services: {
              psi: {
                confirmed: loc.services?.psi?.confirmed
                  ? String(Math.round(parseFloat(loc.services.psi.confirmed) * (1 + PLATFORM_MARGIN)))
                  : ""
              },
              loading: {
                confirmed: loc.services?.loading?.confirmed
                  ? String(Math.round(parseFloat(loc.services.loading.confirmed) * (1 + PLATFORM_MARGIN)))
                  : ""
              },
              stuffing: {
                confirmed: loc.services?.stuffing?.confirmed
                  ? String(Math.round(parseFloat(loc.services.stuffing.confirmed) * (1 + PLATFORM_MARGIN)))
                  : ""
              }
            }
          }))
        }));

      return {
        ...q.toObject(),
        indiaRegions: applyMargin(q.indiaRegions || []),
        intlRegions: applyMargin(q.intlRegions || [])
      };
    });

    return res.json({ success: true, quickInspections: withMargin });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch", error: err.message });
  }
};