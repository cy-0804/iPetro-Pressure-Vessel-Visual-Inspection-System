import React, { useState } from "react";
import "./customerFeedback.css";

const initialState = {
  name: "",
  email: "",
  inspectionId: "",
  rating: "",
  comments: "",
  recommend: "",
};

const CustomerFeedback = () => {
  const [formData, setFormData] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!formData.rating || !formData.comments) {
      setMessage("Please provide at least a rating and your comments.");
      return;
    }

    setSubmitting(true);
    try {
      const feedbackToSave = {
        ...formData,
        submittedAt: new Date().toISOString(),
      };

      // For now just log it – later we'll save this to Firestore.
      console.log("Customer feedback submitted:", feedbackToSave);

      setMessage("✅ Thank you! Your feedback has been recorded.");
      setFormData(initialState);
    } catch (err) {
      console.error(err);
      setMessage("❌ Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-page">
      <h1>Customer Feedback & Quality Assurance</h1>
      <p className="subtitle">
        Help us improve our inspection quality by sharing your feedback.
      </p>

      <form className="feedback-form" onSubmit={handleSubmit}>
        <div className="form-row two-col">
          <div>
            <label>Your Name</label>
            <input
              type="text"
              name="name"
              placeholder="Mr. Ali"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>Email (optional)</label>
            <input
              type="email"
              name="email"
              placeholder="ali@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <label>Inspection / Report ID (if known)</label>
          <input
            type="text"
            name="inspectionId"
            placeholder="V-1070-2025-01"
            value={formData.inspectionId}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <label>Overall Satisfaction Rating</label>
          <div className="rating-row">
            {[1, 2, 3, 4, 5].map((score) => (
              <label key={score} className="rating-option">
                <input
                  type="radio"
                  name="rating"
                  value={score}
                  checked={formData.rating === String(score)}
                  onChange={handleChange}
                />
                <span>{score}</span>
              </label>
            ))}
          </div>
          <small>1 = Very poor, 5 = Excellent</small>
        </div>

        <div className="form-row">
          <label>Comments on Inspection Quality</label>
          <textarea
            name="comments"
            rows={4}
            placeholder="Comment on clarity of report, completeness, accuracy, timeliness, etc."
            value={formData.comments}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <label>Would you recommend our inspection service?</label>
          <select
            name="recommend"
            value={formData.recommend}
            onChange={handleChange}
          >
            <option value="">Select one</option>
            <option value="yes">Yes, definitely</option>
            <option value="maybe">Maybe / Not sure</option>
            <option value="no">No</option>
          </select>
        </div>

        <button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Feedback"}
        </button>

        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
};

export default CustomerFeedback;
