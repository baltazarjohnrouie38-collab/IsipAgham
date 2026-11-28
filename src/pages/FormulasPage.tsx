import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { ALL_LESSONS } from '../data/lessons';
import { FORMULA_TOPIC_GROUPS } from '../data/formulas';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { QuickFormulasView } from '../components/study/QuickFormulasView';

export const FormulasPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quick Formulas"
        subtitle={`${ALL_LESSONS.length} core equations from Physics 1, Physics 2, and Physics 3 organized across ${FORMULA_TOPIC_GROUPS.length} study topics`}
        action={
          <Link to="/lessons">
            <Button variant="outline" size="sm" icon={<BookOpen className="h-4 w-4" />}>
              Browse Lessons
            </Button>
          </Link>
        }
      />

      <QuickFormulasView />
    </div>
  );
};

export default FormulasPage;
