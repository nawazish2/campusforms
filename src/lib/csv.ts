import type { FormDefinition, FormResponse, ResponseStatus } from './types';
import { answerToText } from './utils';

const STATUS_LABEL: Record<ResponseStatus, string> = {
  new: 'New',
  'in-progress': 'In progress',
  done: 'Done',
};

export function downloadResponsesCsv(form: FormDefinition, responses: FormResponse[]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = [
    'Respondent',
    'Email',
    'Submitted at',
    'Status',
    ...form.questions.map((q) => q.title),
  ];
  const rows = responses.map((r) =>
    [
      r.respondentName ?? 'Anonymous',
      r.respondentEmail ?? '',
      new Date(r.submittedAt).toLocaleString('en-US'),
      STATUS_LABEL[r.status ?? 'new'],
      ...form.questions.map((q) => answerToText(r.answers[q.id], q)),
    ]
      .map(esc)
      .join(',')
  );
  const csv = '\uFEFF' + [header.map(esc).join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug =
    form.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'form';
  a.href = url;
  a.download = `${slug}-responses.csv`;
  a.style.display = 'none';
  // Safari and Firefox only honour the download if the anchor is in the
  // document and the object URL is still alive when the click is handled.
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
