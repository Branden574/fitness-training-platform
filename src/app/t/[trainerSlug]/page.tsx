import { redirect } from 'next/navigation';

interface Params {
  trainerSlug: string;
}

export default async function TrainerProfileRedirect({
  params,
}: {
  params: Promise<Params>;
}) {
  const { trainerSlug } = await params;
  redirect(`/apply/${trainerSlug}`);
}
