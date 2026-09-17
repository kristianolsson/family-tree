export const people = [
  {
    id: 'P1',
    names: [{ value: 'Anders Eriksson', type: 'birth', source_id: 'S1' }],
    sex: 'M',
    birth: { date: '1851-04-02', year: null, place: 'Sorby, Vaster Y', source_id: 'S1' },
    death: { date: '1928-07-15', year: null, place: 'Norrby, Vaster Y', age_at_death: 77, source_id: 'S1' },
    occupation: ['Torpare hemmansagare (crofter/smallholder)'],
    notes: '',
    sources: ['S1'],
    conflicts: [],
    status: 'confirmed'
  },
  {
    id: 'P2',
    names: [{ value: 'Maria Karlsson', type: 'birth', source_id: 'S1' }],
    sex: 'F',
    birth: { date: null, year: '1854', place: null, source_id: 'S1' },
    death: null,
    occupation: [],
    notes: '',
    sources: ['S1'],
    conflicts: [],
    status: 'confirmed'
  },
  {
    id: 'P3',
    names: [{ value: 'Per Eriksson', type: 'birth', source_id: 'S2' }],
    sex: 'M',
    birth: { date: '1979-03-11', year: null, place: null, source_id: 'S2' },
    death: null,
    occupation: [],
    notes: '',
    sources: ['S2'],
    conflicts: [],
    status: 'confirmed'
  },
  {
    id: 'P4',
    names: [{ value: 'Per Eriksson', type: 'birth', source_id: 'S3' }],
    sex: 'M',
    birth: { date: null, year: '1976', place: null, source_id: 'S3' },
    death: null,
    occupation: [],
    notes: '',
    sources: ['S3'],
    conflicts: [],
    status: 'confirmed'
  },
  {
    id: 'P5',
    names: [{ value: 'Eva Eriksson', type: 'birth', source_id: 'S2' }],
    sex: 'F',
    birth: { date: null, year: null, place: null, source_id: 'S2' },
    death: null,
    occupation: [],
    notes: "S2 vs S3 disagree on birth year -- confirmed S2's account is correct.",
    sources: ['S2', 'S3'],
    conflicts: [],
    status: 'tentative'
  },
  {
    id: 'P6',
    names: [{ value: 'Second Spouse', type: 'birth', source_id: 'S1' }],
    sex: 'F',
    birth: { date: null, year: null, place: null, source_id: 'S1' },
    death: null,
    occupation: [],
    notes: '',
    sources: ['S1'],
    conflicts: [],
    status: 'confirmed'
  },
  {
    id: 'P7',
    names: [{ value: 'Unknown Sex Person', type: 'birth', source_id: 'S1' }],
    sex: null,
    birth: null,
    death: null,
    occupation: [],
    notes: '',
    sources: [],
    conflicts: [],
    status: 'tentative'
  }
];

export const families = [
  {
    id: 'F1',
    partners: ['P1', 'P2'],
    children: ['P3', 'P5'],
    marriage: { date: '1876-05-20', place: 'Vaster Y', type: 'gift' },
    source_id: 'S1'
  },
  {
    id: 'F2',
    partners: ['P3', null],
    children: [],
    marriage: null,
    source_id: 'S2'
  },
  {
    id: 'F3',
    partners: ['P1', 'P6'],
    children: [],
    marriage: { date: null, place: null, type: 'unknown' },
    source_id: 'S1'
  }
];

export const sources = [
  {
    id: 'S1',
    file: 'images/1.jpg',
    type: 'printed_chart',
    description: 'Printed genealogy chart, Eriksson line',
    transcription_status: 'transcribed',
    notes: ''
  },
  {
    id: 'S2',
    file: 'images/2.jpg',
    type: 'printed_narrative',
    description: 'Ahnentafel narrative',
    transcription_status: 'transcribed',
    notes: ''
  },
  {
    id: 'S3',
    file: 'images/3.jpg',
    type: 'handwritten_note',
    description: 'Handwritten annotation',
    transcription_status: 'partial',
    notes: ''
  }
];
