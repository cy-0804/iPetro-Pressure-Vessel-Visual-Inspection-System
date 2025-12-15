import React, { useState } from "react";
import { db, storage } from "../firebase/firebase"; // Firebase Storage config
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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
    setPhotoFiles(Array.from(e.target.files || []));
  };

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
        <div className="form-row">
          <label>Equipment ID / Tag Number</label>
          <input
            type="text"
            name="equipmentId"
            value={formData.equipmentId}
            onChange={handleChange}
            placeholder="e.g. V-1070"
          />
        </div>

        <div className="form-row">
          <label>Inspection Date</label>
          <input
            type="date"
            name="inspectionDate"
            value={formData.inspectionDate}
            onChange={handleChange}
          />
        </div>

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

export default InspectionForm;
