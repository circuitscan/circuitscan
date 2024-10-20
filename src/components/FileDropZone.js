import React, { useState } from "react";
import { ArrowUpOnSquareIcon } from "@heroicons/react/24/outline";

const FileDropZone = ({ onFileSelect, acceptFiletype }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (onFileSelect) {
        onFileSelect(file);  // Call the prop function with the selected file
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      if (onFileSelect) {
        onFileSelect(file);  // Call the prop function with the dropped file
      }
    }
  };

  const openFileDialog = () => {
    document.getElementById("fileInput").click();
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`max-w-96 h-52 border-4 border-dashed rounded-lg p-10 cursor-pointer transition ${
          isDragging ? "border-blue-500" : "border-gray-300"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          id="fileInput"
          type="file"
          className="hidden"
          accept={acceptFiletype}
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center justify-center h-full">
          <ArrowUpOnSquareIcon className="w-12 h-12 text-gray-400" />
          <p className="text-gray-600 mt-4">
            {selectedFile
              ? `Selected file: ${selectedFile.name}`
              : "Drag & drop a file here or click to select"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileDropZone;

