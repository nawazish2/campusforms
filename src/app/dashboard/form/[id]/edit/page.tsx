'use client';

import { useParams } from 'next/navigation';
import { FormBuilder } from '@/components/form-builder';

export default function EditFormPage() {
  const params = useParams<{ id: string }>();
  return <FormBuilder mode="edit" formId={params.id} />;
}
