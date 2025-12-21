import React, { useState } from "react";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  Textarea,
  Select,
  Button,
  Rating,
  Group,
  Stack,
  SimpleGrid
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

const initialState = {
  name: "",
  email: "",
  inspectionId: "",
  rating: 0,
  comments: "",
  recommend: "",
};

const CustomerFeedback = () => {
  const [formData, setFormData] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.rating === 0 || !formData.comments) {
      notifications.show({title: "Incomplete", message: "Please provide at least a rating and your comments.", color: "yellow"});
      return;
    }

    setSubmitting(true);

    try {
      const feedbackToSave = {
        ...formData,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "customerFeedback"), feedbackToSave);

      notifications.show({title: "Success", message: "Thank you! Your feedback has been recorded.", color: "green"});
      setFormData(initialState);
    } catch (err) {
      console.error("FEEDBACK SUBMIT FAILED:", err);
      notifications.show({title: "Error", message: "Something went wrong. Please try again.", color: "red"});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Title order={2} mb={4}>Customer Feedback & Quality Assurance</Title>
      <Text c="dimmed" mb="lg">
        Help us improve our inspection quality by sharing your feedback.
      </Text>

      <Paper withBorder shadow="sm" p="lg" radius="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Your Name"
                placeholder="Mr. Ali"
                value={formData.name}
                onChange={(e) => handleChange("name", e.currentTarget.value)}
              />
              <TextInput
                label="Email (optional)"
                placeholder="ali@example.com"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.currentTarget.value)}
              />
            </SimpleGrid>

            <TextInput
              label="Inspection / Report ID (if known)"
              placeholder="V-1070-2025-01"
              value={formData.inspectionId}
              onChange={(e) => handleChange("inspectionId", e.currentTarget.value)}
            />

            <Stack gap={4}>
              <Text fw={500} size="sm">Overall Satisfaction Rating</Text>
              <Group align="center">
                <Rating
                  value={formData.rating}
                  onChange={(val) => handleChange("rating", val)}
                  size="lg"
                />
                <Text size="sm" c="dimmed" fw={500}>
                  {formData.rating ? `${formData.rating}/5` : "Select"}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">1 = Very poor, 5 = Excellent</Text>
            </Stack>

            <Textarea
              label="Comments on Inspection Quality"
              placeholder="Comment on clarity of report, completeness, accuracy, timeliness, etc."
              minRows={4}
              value={formData.comments}
              onChange={(e) => handleChange("comments", e.currentTarget.value)}
            />

            <Select
              label="Would you recommend our inspection service?"
              placeholder="Select one"
              data={[
                { value: "yes", label: "Yes, definitely" },
                { value: "maybe", label: "Maybe / Not sure" },
                { value: "no", label: "No" },
              ]}
              value={formData.recommend}
              onChange={(val) => handleChange("recommend", val)}
            />

            <Group justify="flex-end" mt="md">
              <Button type="submit" loading={submitting}>Submit Feedback</Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default CustomerFeedback;
