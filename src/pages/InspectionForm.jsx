import React, { useEffect, useState } from "react";
import { db, storage } from "../firebase"; // Firebase Storage config
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./inspectionForm.css"; // (we'll create this file in a moment)

const initialFormState = {
  equipmentId: "",
  inspectionDate: "",
  inspectorName: "",
  location: "",
  defectType: "",
  severity: "",
  description: "",
};

const defectTypes = [
  "Corrosion",
  "Crack",
  "Leak",
  "Deformation",
  "Weld Defect",
  "Other",
];

const severityLevels = ["Low", "Medium", "High", "Critical"];

const InspectionForm = () => {
  const [formData, setFormData] = useState(initialFormState);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [equipmentSearchOpen, setEquipmentSearchOpen] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState([]); // NEW
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadedUrls, setUploadedUrls] = useState([]);

  // Handle text/select input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle photo selection
  const handlePhotoChange = (e) => {
  const files = Array.from(e.target.files || []);
  setPhotoFiles(files);

  // create previews
  const previews = files.map((file) => URL.createObjectURL(file));
  setPhotoPreviews((prev) => {
    // cleanup old previews
    prev.forEach((url) => URL.revokeObjectURL(url));
    return previews;
  });
};

// remove selected photo preview
const removeSelectedPhoto = (index) => {
  setPhotoFiles((prev) => prev.filter((_, i) => i !== index));

  setPhotoPreviews((prev) => {
    const next = [...prev];
    URL.revokeObjectURL(next[index]);
    next.splice(index, 1);
    return next;
  });
};

  useEffect(() => {
  const fetchEquipment = async () => {
    try {
      const snap = await getDocs(collection(db, "equipments"));
      const list = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
      setEquipmentList(list);
      console.log("Loaded equipments:", list);
    } catch (err) {
      console.error("Failed to load equipment list:", err);
    }
  };

  fetchEquipment();
}, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    // Simple validation
    if (
      !formData.equipmentId ||
      !formData.inspectionDate ||
      !formData.inspectorName
    ) {
      setMessage("Please fill in at least Equipment ID, Date and Inspector Name.");
      return;
    }

    setIsSubmitting(true);

    try {
  // 1) Upload photos to Firebase Storage
  const urls = [];
  for (const file of photoFiles) {
    const storageRef = ref(storage, `inspection-photos/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    urls.push(url);
  }

  // 2) Save inspection data to Firestore
  const dataToSave = {
    ...formData,
    photoUrls: urls,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "inspections"), dataToSave);

  console.log("Saved inspection with ID:", docRef.id);
  setMessage("✅ Inspection saved to Firestore!");

  setFormData(initialFormState);
  setPhotoFiles([]);
  setPhotoPreviews((prev) => {
  prev.forEach((url) => URL.revokeObjectURL(url));
  return [];
  });
setUploadedUrls(urls);
} catch (err) {
  console.error("SUBMIT FAILED:", err);
  setMessage(`❌ Submit failed: ${err?.message || "Unknown error"}`);
}

  };

  return (
    <div className="inspection-form-page">
      <h1>Inspection Form</h1>
      <p className="subtitle">
        Fill in the inspection details and attach supporting photos.
      </p>

      <form className="inspection-form" onSubmit={handleSubmit}>
        
        {/* TOP ROW: Equipment (left) + Date (right) */}
        <div className="top-grid">
          {/* LEFT: Equipment */}
          <div className="form-row equip-block">
            <label>Equipment ID / Tag Number</label>

            <EquipmentSmartSearch
              value={formData.equipmentId}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, equipmentId: val }))
              }
              equipmentList={equipmentList}
              onPick={(eq) => {
                setFormData((prev) => ({ ...prev, equipmentId: eq.tagNumber || "" }));
              }}
            />

            <div className="hint-row">
              <button
                type="button"
                className="link-btn"
                onClick={() => setEquipmentSearchOpen(true)}
              >
                Don’t know tag? Search equipment
              </button>
            </div>
          </div>

          {/* RIGHT: Date */}
          <div className="form-row">
            <label>Inspection Date</label>
            <input
              type="date"
              name="inspectionDate"
              value={formData.inspectionDate}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Modal (Option A) */}
        {equipmentSearchOpen && (
          <EquipmentSearchModal
            equipmentList={equipmentList}
            onClose={() => setEquipmentSearchOpen(false)}
            onPick={(eq) => {
              setFormData((prev) => ({ ...prev, equipmentId: eq.tagNumber || "" }));
              setEquipmentSearchOpen(false);
            }}
          />
        )}

        <div className="form-row">
          <label>Inspector Name</label>
          <input
            type="text"
            name="inspectorName"
            value={formData.inspectorName}
            onChange={handleChange}
            placeholder="e.g. Isaac"
          />
        </div>

        <div className="form-row">
          <label>Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g. Shell Plate, Nozzle N3, Dish Head"
          />
        </div>

        <div className="form-row two-col">
          <div>
            <label>Defect Type</label>
            <select
              name="defectType"
              value={formData.defectType}
              onChange={handleChange}
            >
              <option value="">Select defect type</option>
              {defectTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Severity</label>
            <select
              name="severity"
              value={formData.severity}
              onChange={handleChange}
            >
              <option value="">Select severity</option>
              {severityLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <label>Findings / Description</label>
          <textarea
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the observed condition, pitting depth, corrosion area, etc."
          />
        </div>

        <div className="form-row">
          <label>Inspection Photos</label>
          <input type="file" accept="image/*" multiple onChange={handlePhotoChange} />
          <small>You can select multiple images.</small>

          {photoPreviews.length > 0 && (
            <div className="selected-preview">
              <div className="photo-grid">
                {photoPreviews.map((src, i) => (
                  <div className="photo-item" key={src}>
                    <img src={src} alt={`Selected ${i + 1}`} />
                    <button
                      type="button"
                      className="remove-photo"
                      onClick={() => removeSelectedPhoto(i)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Inspection"}
        </button>

        {message && <p className="message">{message}</p>}
      </form>

      {uploadedUrls.length > 0 && (
        <div className="uploaded-preview">
          <h2>Uploaded Photo Preview</h2>
          <div className="photo-grid">
            {uploadedUrls.map((url) => (
              <img key={url} src={url} alt="Uploaded inspection" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function EquipmentSmartSearch({ value, onChange, equipmentList, onPick }) {
  const [open, setOpen] = useState(false);

  const q = (value || "").toLowerCase().trim();

  const results = equipmentList
    .filter((eq) => {
      const fields = [
        eq.tagNumber,
        eq.type,
        eq.plantUnitArea,
        eq.doshNumber,
        eq.service,
        eq.status,
        eq.function,
        eq.geometry,
        eq.fabricator,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (q.length < 2) return false;  // don’t show anything until user types 2+ chars
      return fields.includes(q);
    })
    .slice(0, 8);

  return (
    <div className="equip-search">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="Type tag, type, plant, DOSH no..."
      />

      {/* 🔎 Hint when input too short */}  
      {open && q.length > 0 && q.length < 2 && (
        <div className="equip-hint">Type at least 2 characters to search…</div>
      )}
      
      {/* 🔽 Dropdown results */}
      {open && q.length >= 2 && results.length > 0 && (
        <div className="equip-dropdown">
          {results.map((eq) => (
            <button
              type="button"
              key={eq.docId}
              className="equip-item"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(eq)}
            >
              <img
                className="equip-thumb"
                src={eq.imageUrl || "https://via.placeholder.com/40"}
                alt={eq.tagNumber || "equipment"}
              />
              <div className="equip-meta">
                <div className="equip-title">
                  <b>{eq.tagNumber || "(No Tag)"}</b>{" "}
                  <span className="equip-status">{eq.status || ""}</span>
                </div>
                <div className="equip-sub">
                  {(eq.type || "-")} • {(eq.plantUnitArea || "-")} • {(eq.doshNumber || "-")}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EquipmentSearchModal({ equipmentList, onClose, onPick }) {
  const [query, setQuery] = useState("");

  const q = query.toLowerCase().trim();
  const results = equipmentList
    .filter((eq) => {
      const fields = [
        eq.tagNumber,
        eq.type,
        eq.plantUnitArea,
        eq.doshNumber,
        eq.service,
        eq.status,
        eq.function,
        eq.geometry,
        eq.fabricator,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return q === "" ? true : fields.includes(q);
    })
    .slice(0, 20);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Select Equipment</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <input
          className="modal-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by tag, type, plant, DOSH no..."
          autoFocus
        />

        <div className="modal-list">
          {results.map((eq) => (
            <button
              type="button"
              key={eq.docId}
              className="modal-item"
              onClick={() => onPick(eq)}
            >
              <img
                className="equip-thumb"
                src={eq.imageUrl || "https://via.placeholder.com/48"}
                alt={eq.tagNumber || "equipment"}
              />
              <div className="equip-meta">
                <div className="equip-title">
                  <b>{eq.tagNumber || "(No Tag)"}</b>{" "}
                  <span className="equip-status">{eq.status || ""}</span>
                </div>
                <div className="equip-sub">
                  {(eq.type || "-")} • {(eq.plantUnitArea || "-")} • {(eq.doshNumber || "-")}
                </div>
              </div>
            </button>
          ))}
          {results.length === 0 && <div className="empty">No results found.</div>}
        </div>
      </div>
    </div>
  );
}

export default InspectionForm;
