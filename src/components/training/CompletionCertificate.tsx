import { forwardRef } from 'react';
import { format } from 'date-fns';

interface CompletionCertificateProps {
  userName: string;
  resourceTitle: string;
  completedAt: Date;
  category?: string;
}

export const CompletionCertificate = forwardRef<HTMLDivElement, CompletionCertificateProps>(
  ({ userName, resourceTitle, completedAt, category }, ref) => {
    return (
      <div
        ref={ref}
        className="w-[800px] h-[600px] bg-white relative overflow-hidden"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {/* Decorative Border */}
        <div className="absolute inset-4 border-4 border-primary/30 rounded-lg" />
        <div className="absolute inset-6 border-2 border-primary/20 rounded-lg" />
        
        {/* Corner Decorations */}
        <div className="absolute top-8 left-8 w-16 h-16 border-t-4 border-l-4 border-primary/40 rounded-tl-lg" />
        <div className="absolute top-8 right-8 w-16 h-16 border-t-4 border-r-4 border-primary/40 rounded-tr-lg" />
        <div className="absolute bottom-8 left-8 w-16 h-16 border-b-4 border-l-4 border-primary/40 rounded-bl-lg" />
        <div className="absolute bottom-8 right-8 w-16 h-16 border-b-4 border-r-4 border-primary/40 rounded-br-lg" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-16 text-center">
          {/* Header */}
          <div className="mb-2">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Glorieta Gardens Apartments
            </p>
          </div>
          
          <h1 className="text-4xl font-bold text-primary mb-2 tracking-wide">
            Certificate of Completion
          </h1>
          
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent my-4" />
          
          <p className="text-lg text-muted-foreground mb-6">
            This is to certify that
          </p>
          
          {/* Recipient Name */}
          <h2 className="text-3xl font-semibold text-foreground mb-6 border-b-2 border-primary/30 pb-2 px-8">
            {userName}
          </h2>
          
          <p className="text-lg text-muted-foreground mb-4">
            has successfully completed the training
          </p>
          
          {/* Course Title */}
          <div className="bg-primary/5 rounded-lg px-8 py-4 mb-6 max-w-lg">
            <h3 className="text-xl font-semibold text-primary">
              {resourceTitle}
            </h3>
            {category && (
              <p className="text-sm text-muted-foreground mt-1">
                {category}
              </p>
            )}
          </div>
          
          <p className="text-muted-foreground mb-8">
            Completed on {format(completedAt, 'MMMM d, yyyy')}
          </p>
          
          {/* Signature Area */}
          <div className="flex items-end gap-16 mt-4">
            <div className="text-center">
              <div className="w-40 border-b border-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Training Administrator</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-b border-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Date Issued</p>
            </div>
          </div>
        </div>

        {/* Watermark */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <p className="text-xs text-muted-foreground/50">
            Training Academy • Glorieta Gardens Apartments
          </p>
        </div>
      </div>
    );
  }
);

CompletionCertificate.displayName = 'CompletionCertificate';
