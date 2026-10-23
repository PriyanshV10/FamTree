"use client";

import React, { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Camera, Trash2, Upload } from "lucide-react";
import { Person, Gender } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  createId,
  getCurrentTimestamp,
  getInitials,
  getAvatarColor,
  isValidFlexibleDate,
  normalizeFlexibleDate,
} from "@/lib/utils";
import { validateDates } from "@/domain/validation";

const personSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    middleName: z.string().optional(),
    lastName: z.string().min(1, "Last name is required"),
    maidenName: z.string().optional(),
    displayName: z.string().optional(),
    gender: z.enum(["male", "female", "other", "unknown"] as const),
    birthDate: z
      .string()
      .optional()
      .refine(
        (val) => isValidFlexibleDate(val),
        "Enter a valid year (e.g. 1948) or date (YYYY-MM, YYYY-MM-DD)"
      ),
    deathDate: z
      .string()
      .optional()
      .refine(
        (val) => isValidFlexibleDate(val),
        "Enter a valid year (e.g. 2021) or date (YYYY-MM, YYYY-MM-DD)"
      ),
    isLiving: z.boolean().default(true),
    birthplace: z.string().optional(),
    occupation: z.string().optional(),
    biography: z.string().optional(),
    photoUrl: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.isLiving) return true;
      if (!data.birthDate || !data.deathDate) return true;
      const res = validateDates(data.birthDate, data.deathDate, data.isLiving);
      return res.isValid;
    },
    {
      message: "Death date cannot be earlier than birth date",
      path: ["deathDate"],
    }
  );

type PersonFormData = z.infer<typeof personSchema>;

interface PersonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Person) => void;
  initialPerson?: Person | null;
  treeId: string;
}

export function PersonFormModal({
  isOpen,
  onClose,
  onSave,
  initialPerson,
  treeId,
}: PersonFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      maidenName: "",
      displayName: "",
      gender: "unknown",
      birthDate: "",
      deathDate: "",
      isLiving: true,
      birthplace: "",
      occupation: "",
      biography: "",
      photoUrl: "",
    },
  });

  const isLiving = useWatch({ control, name: "isLiving", defaultValue: true });
  const watchedFirstName = useWatch({ control, name: "firstName", defaultValue: "" });
  const watchedLastName = useWatch({ control, name: "lastName", defaultValue: "" });
  const watchedPhotoUrl = useWatch({ control, name: "photoUrl", defaultValue: "" });
  const photoPreview = watchedPhotoUrl || null;

  useEffect(() => {
    if (initialPerson) {
      reset({
        firstName: initialPerson.firstName,
        middleName: initialPerson.middleName || "",
        lastName: initialPerson.lastName,
        maidenName: initialPerson.maidenName || "",
        displayName: initialPerson.displayName || "",
        gender: initialPerson.gender,
        birthDate: initialPerson.birthDate || "",
        deathDate: initialPerson.deathDate || "",
        isLiving: initialPerson.isLiving,
        birthplace: initialPerson.birthplace || "",
        occupation: initialPerson.occupation || "",
        biography: initialPerson.biography || "",
        photoUrl: initialPerson.photoUrl || "",
      });
    } else {
      reset({
        firstName: "",
        middleName: "",
        lastName: "",
        maidenName: "",
        displayName: "",
        gender: "unknown",
        birthDate: "",
        deathDate: "",
        isLiving: true,
        birthplace: "",
        occupation: "",
        biography: "",
        photoUrl: "",
      });
    }
  }, [initialPerson, reset, isOpen]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image file size should be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setValue("photoUrl", result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setValue("photoUrl", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (formData: PersonFormData) => {
    const updatedPerson: Person = {
      id: initialPerson ? initialPerson.id : createId("person"),
      treeId,
      firstName: formData.firstName,
      middleName: formData.middleName || undefined,
      lastName: formData.lastName,
      maidenName: formData.maidenName || undefined,
      displayName: formData.displayName || undefined,
      gender: formData.gender as Gender,
      birthDate: normalizeFlexibleDate(formData.birthDate),
      deathDate: formData.isLiving ? undefined : normalizeFlexibleDate(formData.deathDate),
      isLiving: formData.isLiving,
      birthplace: formData.birthplace || undefined,
      occupation: formData.occupation || undefined,
      biography: formData.biography || undefined,
      photoUrl: formData.photoUrl || undefined,
      createdAt: initialPerson ? initialPerson.createdAt : getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    onSave(updatedPerson);
    onClose();
  };

  const tempInitials = getInitials(`${watchedFirstName} ${watchedLastName}`.trim() || "New Member");
  const avatarBg = initialPerson ? getAvatarColor(initialPerson.id) : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200";

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialPerson ? "Edit Family Member" : "Add Family Member"}
      description="Record names, life dates, photo portrait, and biographical context for your family tree."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Photo Portrait Upload & Preview */}
        <div className="flex items-center gap-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40 p-3.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="relative group shrink-0">
            {photoPreview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={photoPreview}
                alt="Profile Preview"
                className="h-16 w-16 rounded-full object-cover border-2 border-emerald-500 shadow-2xs"
              />
            ) : (
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full border-2 border-stone-200 dark:border-stone-700 text-base font-bold ${avatarBg}`}
              >
                {tempInitials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Upload Photo"
            >
              <Camera className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              Profile Portrait
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Upload an image or photo of this family member.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 text-xs gap-1.5"
              >
                <Upload className="h-3 w-3" />
                Upload Photo
              </Button>
              {photoPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePhoto}
                  className="h-7 text-xs gap-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Name Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="First Name *"
            placeholder="e.g. Arthur"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <Input
            label="Middle Name"
            placeholder="e.g. James"
            error={errors.middleName?.message}
            {...register("middleName")}
          />
          <Input
            label="Last Name *"
            placeholder="e.g. Sterling"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Maiden / Birth Name"
            placeholder="e.g. Vance (if changed)"
            error={errors.maidenName?.message}
            {...register("maidenName")}
          />
          <Select
            label="Gender"
            error={errors.gender?.message}
            {...register("gender")}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
              { value: "unknown", label: "Unknown / Not recorded" },
            ]}
          />
        </div>

        {/* Dates & Living Status */}
        <div className="rounded-xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isLiving"
              className="h-4 w-4 rounded border-stone-300 text-emerald-800 focus:ring-emerald-700"
              {...register("isLiving")}
            />
            <label htmlFor="isLiving" className="text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer">
              This person is currently living
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="Birth Date"
                placeholder="e.g. 1948 or 1948-05-12"
                error={errors.birthDate?.message}
                {...register("birthDate")}
              />
              <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                Year only (1948) or full date (YYYY-MM-DD)
              </p>
            </div>
            {!isLiving && (
              <div>
                <Input
                  label="Death Date"
                  placeholder="e.g. 2021 or 2021-11-04"
                  error={errors.deathDate?.message}
                  {...register("deathDate")}
                />
                <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                  Year only (2021) or full date (YYYY-MM-DD)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Place & Occupation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Birthplace"
            placeholder="e.g. Boston, MA"
            error={errors.birthplace?.message}
            {...register("birthplace")}
          />
          <Input
            label="Occupation"
            placeholder="e.g. Architect, Botanist"
            error={errors.occupation?.message}
            {...register("occupation")}
          />
        </div>

        {/* Biography */}
        <Textarea
          label="Biographical Notes"
          placeholder="Stories, historical notes, achievements, or oral family history..."
          rows={3}
          error={errors.biography?.message}
          {...register("biography")}
        />

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {initialPerson ? "Save Changes" : "Add to Tree"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
