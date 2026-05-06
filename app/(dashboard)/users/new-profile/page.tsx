import ProfileForm from "@/components/forms/ProfileForm";
export default function NewProfilePage() {
  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-2xl font-bold">New Profile</h1>
      <ProfileForm />
    </div>
  );
}
