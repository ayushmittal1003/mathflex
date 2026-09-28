// Chapter / course picker for the grant-access forms. Value is "chapter:<id>" or "course:<id>".
export function AccessTarget({ chapters, courses }: {
  chapters: { id: string; title: string; classLevel: number }[];
  courses: { id: string; title: string }[];
}) {
  return (
    <select name="target" className="input" required>
      {courses.length > 0 && <optgroup label="Courses">{courses.map((c) => <option key={c.id} value={`course:${c.id}`}>{c.title}</option>)}</optgroup>}
      {[11, 12].map((cls) => (
        <optgroup key={cls} label={`Class ${cls} chapters`}>
          {chapters.filter((c) => c.classLevel === cls).map((c) => <option key={c.id} value={`chapter:${c.id}`}>{c.title}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
