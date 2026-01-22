import React, { useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function MedicalClassifier() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setResult(null);
    }
  };

  const analyzeImage = async () => {
    setAnalyzing(true);
    
    // Simulation de l'appel API - REMPLACEZ CECI par votre vraie API
    setTimeout(() => {
      const mockResults = [
        {
          predictions: [
            { class: 'Normal', confidence: 12.5 },
            { class: 'Pneumonie', confidence: 78.3 },
            { class: 'Tuberculose', confidence: 9.2 }
          ],
          diagnosis: 'Pneumonie'
        },
        {
          predictions: [
            { class: 'Normal', confidence: 85.7 },
            { class: 'Pneumonie', confidence: 8.1 },
            { class: 'Tuberculose', confidence: 6.2 }
          ],
          diagnosis: 'Normal'
        },
        {
          predictions: [
            { class: 'Normal', confidence: 15.3 },
            { class: 'Pneumonie', confidence: 18.4 },
            { class: 'Tuberculose', confidence: 66.3 }
          ],
          diagnosis: 'Tuberculose'
        }
      ];
      
      const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
      setResult(randomResult);
      setAnalyzing(false);
    }, 2000);

    /* POUR CONNECTER À VOTRE VRAIE API, UTILISEZ CE CODE :
    
    try {
      const formData = new FormData();
      formData.append('file', image);
      
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      setResult(data);
      setAnalyzing(false);
    } catch (error) {
      console.error('Erreur:', error);
      setAnalyzing(false);
    }
    */
  };

  const reset = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setAnalyzing(false);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return 'bg-red-500';
    if (confidence >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getDiagnosisColor = (diagnosis) => {
    if (diagnosis === 'Normal') return 'text-green-600 bg-green-50 border-green-200';
    if (diagnosis === 'Pneumonie') return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Classification d'Images Médicales
          </h1>
          <p className="text-gray-600">
            Détection de Pneumonie et Tuberculose par IA
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {!preview ? (
            // Upload Zone
            <div
              className={`border-3 border-dashed rounded-xl p-12 text-center transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/*"
                onChange={handleChange}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-16 h-16 text-blue-500 mb-4" />
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  Glissez une image ou cliquez pour uploader
                </p>
                <p className="text-sm text-gray-500">
                  Formats supportés: PNG, JPG, JPEG
                </p>
              </label>
            </div>
          ) : (
            // Preview and Results
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Analyse de l'image
                </h2>
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Nouvelle image
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Image Preview */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">
                    Image uploadée
                  </h3>
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full rounded-lg shadow-md border-2 border-gray-200"
                  />
                </div>

                {/* Results */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">
                    Résultats
                  </h3>

                  {!result && !analyzing && (
                    <button
                      onClick={analyzeImage}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Analyser l'image
                    </button>
                  )}

                  {analyzing && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                      <p className="text-gray-600">Analyse en cours...</p>
                    </div>
                  )}

                  {result && (
                    <div className="space-y-4">
                      {/* Diagnosis */}
                      <div className={`p-4 rounded-lg border-2 ${getDiagnosisColor(result.diagnosis)}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {result.diagnosis === 'Normal' ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <AlertCircle className="w-5 h-5" />
                          )}
                          <span className="font-semibold">Diagnostic:</span>
                        </div>
                        <p className="text-2xl font-bold">{result.diagnosis}</p>
                      </div>

                      {/* Predictions */}
                      <div className="space-y-3">
                        <p className="font-semibold text-gray-700">
                          Niveaux de confiance:
                        </p>
                        {result.predictions.map((pred, index) => (
                          <div key={index}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-gray-700">
                                {pred.class}
                              </span>
                              <span className="font-semibold text-gray-800">
                                {pred.confidence.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${getConfidenceColor(
                                  pred.confidence
                                )}`}
                                style={{ width: `${pred.confidence}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Disclaimer */}
                      <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800">
                          <strong>Note:</strong> Ces résultats sont générés par IA et ne remplacent pas un diagnostic médical professionnel.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Système de classification basé sur l'apprentissage profond</p>
        </div>
      </div>
    </div>
  );
}