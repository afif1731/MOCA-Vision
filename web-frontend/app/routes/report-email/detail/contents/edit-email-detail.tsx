import InputForm from '@/components/form/input';

export function EditEmailDetail() {
  return (
    <div className="flex w-full flex-col gap-4 rounded-xl bg-white px-6 py-6 drop-shadow-black/50 drop-shadow-xl lg:px-8">
      <InputForm isRequired name="name" label="Receiver Name" placeholder="e.g. Admin Report" />

      <InputForm
        isRequired
        name="email"
        label="Email Address"
        placeholder="e.g. admin@example.com"
        inputProps={{ type: 'email' }}
      />
    </div>
  );
}
