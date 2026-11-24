import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileUp,
  FileText,
  Layers,
  Trash2,
  BookMarked,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SEED_PHYSICS_MATERIALS } from '../../data/seedMaterials';
import { extractDocumentApi, generateStudySetApi } from '../../lib/api';
import {
  deleteStudyMaterial,
  saveStudyMaterial,
  saveStudySet,
} from '../../lib/studyService';
import type { MaterialSourceType, PhysicsCourse, StudyMaterial } from '../../types';
import { AlertBanner } from '../ui/AlertBanner';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input, Select, Textarea } from '../ui/Input';

interface MaterialsTabProps {
  materials: StudyMaterial[];
  onGeneratedSet: (setId: string) => void;
}

type GenerateFocus = 'all' | 'flashcards' | 'reviewer' | 'quiz';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const MaterialsTab: React.FC<MaterialsTabProps> = ({
  materials,
  onGeneratedSet,
}) => {
  const { user, profile, toggleChecklistItem } = useAuth();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [inputMode, setInputMode] = useState<'file' | 'text'>(
    searchParams.get('mode') === 'text' ? 'text' : 'file'
  );

  useEffect(() => {
    if (searchParams.get('mode') === 'text') {
      setInputMode('text');
    }
  }, [searchParams]);

  const [title, setTitle] = useState('');
  const [course, setCourse] = useState<PhysicsCourse>(profile?.course || 'Physics 1');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [generateFocus, setGenerateFocus] = useState<GenerateFocus>('all');

  const [extracting, setExtracting] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [courseFilter, setCourseFilter] = useState<'All' | PhysicsCourse>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0] || null;
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setErrorMsg('File exceeds the 10 MB size limit. Please choose a smaller file.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    if (!title.trim()) {
      const baseName = file.name.replace(/\.[^.]+$/, '');
      setTitle(baseName.slice(0, 120));
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);
    setStatusMsg(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMsg('Please enter a title for your study material.');
      return;
    }

    setExtracting(true);
    try {
      let extractedText = '';
      let sourceType: MaterialSourceType = 'text';

      if (inputMode === 'file') {
        if (!selectedFile) {
          setErrorMsg('Please select a PDF, PPTX, DOCX, or photo file.');
          setExtracting(false);
          return;
        }
        const result = await extractDocumentApi(selectedFile);
        extractedText = result.extractedText;
        sourceType = result.sourceType;
      } else {
        if (pastedText.trim().length < 20) {
          setErrorMsg('Please paste at least 20 characters of Physics notes.');
          setExtracting(false);
          return;
        }
        extractedText = pastedText.trim();
        sourceType = 'text';
      }

      await saveStudyMaterial({
        userId: user.uid,
        title: cleanTitle,
        course,
        sourceType,
        extractedText,
      });

      void toggleChecklistItem('upload_material', true);
      setTitle('');
      setPastedText('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setStatusMsg(`Saved "${cleanTitle}"! Now tap "Generate Study Set" below to create flashcards and a quiz.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save material.');
    } finally {
      setExtracting(false);
    }
  };

  const handleLoadSeeds = async () => {
    if (!user) return;
    setSeeding(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const existingTitles = new Set(materials.map((m) => m.title));
      let added = 0;
      for (const seed of SEED_PHYSICS_MATERIALS) {
        if (!existingTitles.has(seed.title)) {
          await saveStudyMaterial({
            userId: user.uid,
            title: seed.title,
            course: seed.course,
            sourceType: 'seed',
            extractedText: seed.extractedText,
          });
          added += 1;
        }
      }
      if (added > 0) {
        void toggleChecklistItem('upload_material', true);
        setStatusMsg(`Added ${added} sample DepEd Physics materials (Physics 1, 2, and 3).`);
      } else {
        setStatusMsg('Sample Physics materials are already in your library.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not add sample materials.');
    } finally {
      setSeeding(false);
    }
  };

  const handleGenerateStudySet = async (mat: StudyMaterial) => {
    if (!user) return;
    setErrorMsg(null);
    setStatusMsg(null);
    setGeneratingId(mat.id);
    try {
      const generated = await generateStudySetApi({
        title: mat.title,
        course: mat.course,
        extractedText: mat.extractedText,
        focus: generateFocus,
      });

      const setId = await saveStudySet({
        userId: user.uid,
        materialId: mat.id,
        title: mat.title,
        course: mat.course,
        reviewerSummary: generated.reviewerSummary,
        flashcards: generated.flashcards,
        quizQuestions: generated.quizQuestions,
      });

      void toggleChecklistItem('generate_flashcards', true);
      onGeneratedSet(setId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate study set.');
    } finally {
      setGeneratingId(null);
    }
  };

  const filteredMaterials =
    courseFilter === 'All' ? materials : materials.filter((m) => m.course === courseFilter);

  return (
    <div className="space-y-6">
      {statusMsg && (
        <AlertBanner tone="success" title="Study Material Ready">
          {statusMsg}
        </AlertBanner>
      )}
      {errorMsg && (
        <AlertBanner tone="error" title="Upload Notice">
          {errorMsg}
        </AlertBanner>
      )}

      {/* Upload / Paste Card */}
      <Card className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100">
              Add Study Material
            </h2>
            <p className="text-sm text-slate-600 dark:text-neutral-400">
              Drop in PDF, PPTX, DOCX, photo notes (OCR), or pasted text (max 10 MB). Do not upload personal info.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<BookMarked className="h-4 w-4" />}
            loading={seeding}
            onClick={() => {
              void handleLoadSeeds();
            }}
          >
            Load Sample Physics Notes
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-stone-100 dark:bg-neutral-800 max-w-xs">
          <button
            type="button"
            onClick={() => setInputMode('file')}
            className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              inputMode === 'file'
                ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400'
            }`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setInputMode('text')}
            className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              inputMode === 'text'
                ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400'
            }`}
          >
            Paste Text
          </button>
        </div>

        <form onSubmit={handleSaveMaterial} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Material Title"
                placeholder="e.g., Week 3 Projectile Motion Slides"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                required
              />
            </div>
            <Select
              label="Course"
              value={course}
              onChange={(e) => setCourse(e.target.value as PhysicsCourse)}
            >
              <option value="Physics 1">Physics 1</option>
              <option value="Physics 2">Physics 2</option>
              <option value="Physics 3">Physics 3</option>
            </Select>
          </div>

          {inputMode === 'file' ? (
            <div className="space-y-2">
              <label
                htmlFor="material-file-upload"
                className="block text-sm font-medium text-slate-800 dark:text-neutral-200"
              >
                Choose File (.pdf, .pptx, .docx, .png, .jpg, .webp)
              </label>
              <input
                ref={fileInputRef}
                id="material-file-upload"
                type="file"
                accept=".pdf,.pptx,.docx,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="block w-full rounded-xl border border-stone-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm text-slate-700 dark:text-neutral-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-l-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-800 dark:file:bg-blue-950 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer"
              />
              {selectedFile && (
                <p className="text-xs text-slate-500 dark:text-neutral-400 tabular-nums">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          ) : (
            <Textarea
              label="Physics Notes / Reviewer Text"
              placeholder="Paste your lecture notes, formulas, or module text here..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={6}
            />
          )}

          <Button
            type="submit"
            loading={extracting}
            icon={inputMode === 'file' ? <FileUp className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          >
            {extracting ? 'Extracting Text...' : 'Extract & Save Material'}
          </Button>
        </form>
      </Card>

      {/* Saved Materials List */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100">
              Your Study Materials ({filteredMaterials.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Choose what to emphasize before tapping Generate.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-52">
              <Select
                label="What to generate"
                value={generateFocus}
                onChange={(e) => setGenerateFocus(e.target.value as GenerateFocus)}
              >
                <option value="all">All (Flashcards, Reviewer &amp; Quiz)</option>
                <option value="flashcards">Flashcards Focus (More cards)</option>
                <option value="reviewer">Reviewer Summary Focus</option>
                <option value="quiz">Mixed Quiz Focus (More questions)</option>
              </Select>
            </div>

            <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-stone-100 dark:bg-neutral-800">
              {(['All', 'Physics 1', 'Physics 2', 'Physics 3'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setCourseFilter(filter)}
                  className={`px-3 min-h-[38px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    courseFilter === filter
                      ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 shadow-xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredMaterials.length === 0 ? (
          <Card className="text-center py-10 space-y-3">
            <p className="text-base font-semibold text-slate-900 dark:text-neutral-100">
              No Study Materials yet
            </p>
            <p className="text-sm text-slate-600 dark:text-neutral-400 max-w-md mx-auto">
              Upload a PDF, PPTX, DOCX, photo of your notes, paste text above, or click Load Sample Physics Notes to start right away.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredMaterials.map((mat) => {
              const isExpanded = expandedId === mat.id;
              const isGenerating = generatingId === mat.id;
              return (
                <Card key={mat.id} className="space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100 truncate">
                        {mat.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-neutral-400 tabular-nums">
                        {mat.course} · {mat.sourceType.toUpperCase()} · {mat.extractedText.length.toLocaleString()} characters
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        onClick={() => setExpandedId(isExpanded ? null : mat.id)}
                      >
                        {isExpanded ? 'Hide Text' : 'Preview'}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={isGenerating}
                        disabled={generatingId !== null && !isGenerating}
                        icon={<Layers className="h-4 w-4" />}
                        onClick={() => {
                          void handleGenerateStudySet(mat);
                        }}
                      >
                        {isGenerating ? 'Building Flashcards & Quiz...' : 'Generate Study Set'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${mat.title}`}
                        icon={<Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />}
                        onClick={() => {
                          void deleteStudyMaterial(mat.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-neutral-300 bg-[#FAF9F6] dark:bg-neutral-950 border border-stone-200 dark:border-neutral-800 rounded-xl p-4 max-h-64 overflow-y-auto font-sans leading-relaxed">
                      {mat.extractedText}
                    </pre>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
