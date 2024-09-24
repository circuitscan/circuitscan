import React from "react";

export function AnnotatedText({ text, sections }) {
  // Helper function to create annotated or plain text segments
  const createAnnotatedSpan = (textSegment, key, activeAnnotations) => {
    if (activeAnnotations.length === 0) {
      // No active annotations
      return <span key={key}>{textSegment}</span>;
    } else {
      // Combine messages for overlapping annotations
      const combinedMessage = activeAnnotations
        .map((a) => `${a.category}: ${a.message}`)
        .join(", ");
      const bgColor = activeAnnotations.reduce((out, cur) => {
        if(cur.category === 'Warning' && out < 1) return 1;
        if(cur.category === 'Error' && out < 2) return 2;
        return out;
      }, 0);
      return (
        <span
          key={key}
          tabIndex="0"
          className={`
            relative group rounded-md cursor-pointer
            ${bgColor === 0
              ? 'bg-blue-500/30 hover:bg-blue-500/60'
              : bgColor === 1
              ? 'bg-orange-500/30 hover:bg-orange-500/60'
              : 'bg-red-500/30 hover:bg-red-500/60'}
          `}
        >
          {textSegment}
          <span className="absolute left-0 bottom-full w-max max-w-xs p-2 text-xs text-white bg-neutral-700 rounded-md opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity whitespace-normal z-50">
            {combinedMessage}
          </span>
        </span>
      );
    }
  };

  // Helper function to split the text and apply annotations for a single section
  const renderSectionText = (sectionText, annotations, sectionPos) => {
    const annotatedText = [];
    let lastIndex = 0;

    // Build events for annotation start and end
    const events = [];

    annotations.forEach((annotation) => {
      events.push({ position: annotation.start, type: "start", annotation });
      events.push({ position: annotation.end, type: "end", annotation });
    });

    // Sort events by position; start events before end events at the same position
    events.sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      } else if (a.type === "start" && b.type === "end") {
        return -1;
      } else if (a.type === "end" && b.type === "start") {
        return 1;
      } else {
        return 0;
      }
    });

    let activeAnnotations = [];

    events.forEach((event) => {
      if (event.position > lastIndex) {
        const textSegment = sectionText.slice(lastIndex, event.position);
        const key = `text-${lastIndex}-${event.position}`;
        annotatedText.push(
          createAnnotatedSpan(textSegment, key, activeAnnotations)
        );
      }

      lastIndex = event.position;

      if (event.type === "start") {
        activeAnnotations.push(event.annotation);
      } else if (event.type === "end") {
        activeAnnotations = activeAnnotations.filter(
          (a) => a !== event.annotation
        );
      }
    });

    // Add the remaining text after the last event
    if (lastIndex < sectionText.length) {
      const textSegment = sectionText.slice(lastIndex);
      const key = `text-${lastIndex}-end`;
      annotatedText.push(
        createAnnotatedSpan(textSegment, key, activeAnnotations)
      );
    }

    return annotatedText;
  };

  // Main function to process all sections
  const renderAnnotatedText = () => {
    const annotatedSections = [];
    let lastSectionEnd = 0;

    sections.forEach((section, idx) => {
      const sectionStart = section.pos;
      const sectionEnd =
        idx + 1 < sections.length ? sections[idx + 1].pos : text.length;

      // Add text before the section if any
      if (sectionStart > lastSectionEnd) {
        annotatedSections.push(
          <span key={`text-before-section-${idx}`}>
            {text.slice(lastSectionEnd, sectionStart)}
          </span>
        );
      }

      const sectionText = text.slice(sectionStart, sectionEnd);

      annotatedSections.push(
        <span key={`section-${idx}`}>
          {renderSectionText(sectionText, section.reports, sectionStart)}
        </span>
      );

      lastSectionEnd = sectionEnd;
    });

    // Add remaining text after the last section
    if (lastSectionEnd < text.length) {
      annotatedSections.push(
        <span key={`text-after-last-section`}>
          {text.slice(lastSectionEnd)}
        </span>
      );
    }

    annotatedSections.push(<span key="line-numbers" aria-hidden="true" className="line-numbers-rows">
      {new Array(text.split('\n').length - (text.endsWith('\n') ? 1 : 0)).fill(null).map((x, i) => <span key={i}></span>)}
    </span>);

    return annotatedSections;
  };

  return <div>{renderAnnotatedText()}</div>;
}

