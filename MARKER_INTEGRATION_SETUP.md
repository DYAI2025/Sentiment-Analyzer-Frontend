# Marker Engine Integration - Setup Guide

## Übersicht

Dieses Frontend ist nun vollständig für die Integration mit der Marker Engine und Supabase vorbereitet. Es unterstützt:

- ✅ **Dokument-Upload** mit Drag & Drop
- ✅ **Echtzeit-Verarbeitung** mit der Marker Engine
- ✅ **Live-Annotations** über Supabase Realtime
- ✅ **Sentiment-Analyse** auf extrahiertem Text
- ✅ **Interactive Visualisierung** der Annotations

## Architektur

```
┌─────────────────┐
│   Frontend UI   │
│  (HTML/JS)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase       │
│  - Storage      │  ◄──► Dokumente (PDF, DOCX, etc.)
│  - Database     │  ◄──► Jobs, Annotations, Analyses
│  - Realtime     │  ◄──► Live Updates
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Marker Engine  │
│  Backend        │  ◄──► PDF → Text Extraction
│  (Python)       │        Markdown Generation
└─────────────────┘        Annotations
```

## 1. Supabase Setup

### Schritt 1: Supabase Projekt erstellen

1. Gehen Sie zu [https://supabase.com](https://supabase.com)
2. Erstellen Sie ein neues Projekt
3. Notieren Sie sich:
   - `Project URL` (z.B. `https://xxxxx.supabase.co`)
   - `anon/public API Key`

### Schritt 2: Datenbank-Schema erstellen

Führen Sie das folgende SQL in Ihrem Supabase SQL Editor aus:

```sql
-- Marker Jobs Tabelle
CREATE TABLE marker_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  extracted_text TEXT,
  markdown_output TEXT,
  options JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Text Annotations Tabelle
CREATE TABLE text_annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES marker_jobs(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  position INTEGER NOT NULL,
  sentiment_score NUMERIC(3, 2),
  emotion TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sentiment Analysis Tabelle
CREATE TABLE sentiment_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES marker_jobs(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  overall_sentiment NUMERIC(3, 2),
  emotions JSONB,
  language TEXT,
  confidence NUMERIC(3, 2),
  status TEXT DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indizes für Performance
CREATE INDEX idx_marker_jobs_user_id ON marker_jobs(user_id);
CREATE INDEX idx_marker_jobs_status ON marker_jobs(status);
CREATE INDEX idx_text_annotations_job_id ON text_annotations(job_id);
CREATE INDEX idx_sentiment_analysis_job_id ON sentiment_analysis(job_id);

-- Row Level Security (RLS) aktivieren
ALTER TABLE marker_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own jobs"
  ON marker_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs"
  ON marker_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
  ON marker_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view annotations of their jobs"
  ON text_annotations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM marker_jobs
    WHERE marker_jobs.id = text_annotations.job_id
    AND marker_jobs.user_id = auth.uid()
  ));

CREATE POLICY "System can insert annotations"
  ON text_annotations FOR INSERT
  WITH CHECK (true);

-- Realtime aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE marker_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE text_annotations;
ALTER PUBLICATION supabase_realtime ADD TABLE sentiment_analysis;
```

### Schritt 3: Storage Bucket erstellen

1. Gehen Sie zu `Storage` in Supabase Dashboard
2. Erstellen Sie einen neuen Bucket namens `documents`
3. Setzen Sie die Policy:

```sql
-- Storage Policy für documents bucket
CREATE POLICY "Users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
```

## 2. Frontend Konfiguration

### Schritt 1: Supabase Credentials eintragen

Bearbeiten Sie `assets/js/config/supabase.config.js`:

```javascript
const SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_ID.supabase.co',
  anonKey: 'YOUR_ANON_KEY_HERE',
  realtime: {
    enabled: true,
    heartbeatInterval: 30000,
    reconnectDelay: 1000,
  }
};
```

### Schritt 2: Frontend testen

1. Öffnen Sie `pages/marker-integration.html` im Browser
2. Überprüfen Sie die Browser-Konsole auf Fehler
3. Testen Sie den Dokument-Upload

## 3. Backend-Integration (Marker Engine)

### Python Backend Beispiel

Erstellen Sie ein Python-Backend, das auf Supabase-Events reagiert:

```python
from supabase import create_client, Client
import marker
import os

# Supabase Client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

def process_document(job_id: str):
    """Verarbeitet ein Dokument mit Marker Engine"""

    # Job abrufen
    job = supabase.table('marker_jobs').select('*').eq('id', job_id).single().execute()

    # Status auf 'processing' setzen
    supabase.table('marker_jobs').update({
        'status': 'processing',
        'progress': 10
    }).eq('id', job_id).execute()

    # Datei von Supabase Storage herunterladen
    file_path = job.data['file_path']
    file_data = supabase.storage.from_('documents').download(file_path)

    # Marker Engine ausführen
    try:
        result = marker.convert_pdf(file_data)

        # Fortschritt aktualisieren
        supabase.table('marker_jobs').update({
            'progress': 50
        }).eq('id', job_id).execute()

        # Text extrahieren
        extracted_text = result.text
        markdown = result.markdown

        # Annotations erstellen
        for i, annotation in enumerate(result.annotations):
            supabase.table('text_annotations').insert({
                'job_id': job_id,
                'text': annotation.text,
                'position': i,
                'sentiment_score': annotation.sentiment,
                'emotion': annotation.emotion,
                'metadata': annotation.metadata
            }).execute()

        # Job als abgeschlossen markieren
        supabase.table('marker_jobs').update({
            'status': 'completed',
            'progress': 100,
            'extracted_text': extracted_text,
            'markdown_output': markdown,
            'completed_at': 'NOW()'
        }).eq('id', job_id).execute()

    except Exception as e:
        # Fehler speichern
        supabase.table('marker_jobs').update({
            'status': 'failed',
            'error_message': str(e)
        }).eq('id', job_id).execute()

# Auf neue Jobs warten
def listen_for_jobs():
    """Wartet auf neue Jobs in der Datenbank"""

    # Polling oder Webhook-basiert
    while True:
        pending_jobs = supabase.table('marker_jobs')\
            .select('id')\
            .eq('status', 'pending')\
            .execute()

        for job in pending_jobs.data:
            process_document(job['id'])

        time.sleep(5)  # Alle 5 Sekunden prüfen

if __name__ == '__main__':
    listen_for_jobs()
```

### Alternative: Supabase Edge Functions

Erstellen Sie eine Edge Function für serverlose Verarbeitung:

```typescript
// supabase/functions/process-marker-job/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { job_id } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Job verarbeiten
  // Marker Engine API aufrufen
  // Ergebnisse speichern

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } },
  )
})
```

## 4. Workflow

### Kompletter Ablauf:

1. **User lädt Dokument hoch**
   - Frontend: `DocumentUploadComponent`
   - Datei wird zu Supabase Storage hochgeladen
   - Job-Eintrag in `marker_jobs` wird erstellt

2. **Backend erkennt neuen Job**
   - Python Worker oder Edge Function
   - Lädt Datei von Storage herunter
   - Startet Marker Engine Verarbeitung

3. **Echtzeit-Updates**
   - Backend aktualisiert `marker_jobs.progress`
   - Frontend erhält Update via Supabase Realtime
   - `ProcessingStatusComponent` zeigt Fortschritt

4. **Annotations werden erstellt**
   - Marker extrahiert Text-Segmente
   - Annotations werden in DB gespeichert
   - Frontend erhält neue Annotations in Echtzeit
   - `AnnotationsViewerComponent` visualisiert live

5. **Sentiment-Analyse**
   - Extrahierter Text wird analysiert
   - Sentiment-Scores werden gespeichert
   - Ergebnisse im Dashboard angezeigt

## 5. Features

### Implementierte Komponenten:

- **DocumentUploadComponent**: Drag & Drop Upload
- **ProcessingStatusComponent**: Live Progress Tracking
- **AnnotationsViewerComponent**: Interactive Text Annotations
- **MarkerEngineService**: API für Marker-Operationen
- **RealtimeAnnotationsService**: Websocket-Verbindung
- **MarkerIntegrationApp**: Hauptorchestrator

### API Endpoints (via Services):

- `uploadAndProcess(file, options)` - Dokument hochladen
- `getJobStatus(jobId)` - Job-Status abrufen
- `getExtractedText(jobId)` - Text abrufen
- `getAnnotations(jobId)` - Annotations abrufen
- `createAnnotation(data)` - Annotation erstellen
- `analyzeSentiment(jobId, text)` - Sentiment analysieren
- `subscribeToJob(jobId, handlers)` - Echtzeit-Updates

## 6. Nächste Schritte

1. ✅ Supabase Projekt einrichten
2. ✅ Datenbank-Schema erstellen
3. ✅ Storage konfigurieren
4. ✅ Supabase Credentials im Frontend eintragen
5. ⏳ Marker Engine Backend implementieren
6. ⏳ Webhook/Worker für Job-Verarbeitung
7. ⏳ Sentiment Analysis Service anbinden
8. ⏳ Testing und Deployment

## 7. Umgebungsvariablen

Erstellen Sie eine `.env`-Datei:

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Marker Engine (optional)
MARKER_API_URL=http://localhost:8000
MARKER_API_KEY=your-marker-api-key

# Sentiment Analysis (optional)
SENTIMENT_API_URL=https://text-sentiment-analyzer.onrender.com
```

## 8. Troubleshooting

### Problem: Supabase Verbindung fehlschlägt
- Überprüfen Sie URL und API-Key in `supabase.config.js`
- Prüfen Sie Browser-Konsole auf CORS-Fehler
- Stellen Sie sicher, dass RLS-Policies korrekt sind

### Problem: Realtime funktioniert nicht
- Aktivieren Sie Realtime für Tabellen im Supabase Dashboard
- Überprüfen Sie `ALTER PUBLICATION` statements
- Prüfen Sie Network-Tab auf WebSocket-Verbindung

### Problem: Upload fehlschlägt
- Überprüfen Sie Storage Policies
- Prüfen Sie Bucket-Name (`documents`)
- Überprüfen Sie Dateigrößen-Limits

## 9. Dokumentation

Weitere Informationen:

- [Supabase Dokumentation](https://supabase.com/docs)
- [Marker Engine GitHub](https://github.com/VikParuchuri/marker)
- [Material Dashboard Docs](https://demos.creative-tim.com/material-dashboard/docs/2.1/getting-started/introduction.html)

## Support

Bei Fragen oder Problemen:
- Überprüfen Sie die Browser-Konsole
- Prüfen Sie Supabase Logs
- Öffnen Sie ein GitHub Issue

---

**Status**: ✅ Frontend vollständig vorbereitet
**Next**: Backend-Integration mit Marker Engine
