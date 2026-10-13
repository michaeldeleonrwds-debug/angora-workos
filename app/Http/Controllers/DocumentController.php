<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Document;
use App\Models\DocumentCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $categories = DocumentCategory::withCount('documents')->get();
        $documents = Document::with(['category', 'user'])
            ->where('is_trashed', false)
            ->latest()
            ->get();
        $trashedDocuments = Document::with(['category', 'user'])
            ->where('is_trashed', true)
            ->latest()
            ->get();

        return Inertia::render('documents/index', [
            'categories' => $categories,
            'documents' => $documents,
            'trashedDocuments' => $trashedDocuments,
        ]);
    }

    public function storeDocument(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:document_categories,id',
            'title' => 'required|string',
            'original_filename' => 'required|string',
            'department_access' => 'required|string',
            'version' => 'required|string',
        ]);

        $doc = Document::create([
            ...$validated,
            'user_id' => auth()->id(),
            'file_size_kb' => rand(250, 4200),
            'mime_type' => 'application/pdf',
        ]);

        AuditLog::log(
            action: 'DOCUMENT_UPLOADED',
            department: $doc->department_access === 'All' ? 'General' : $doc->department_access,
            entityType: 'Document',
            entityId: $doc->id,
            description: "Uploaded document: {$doc->title} ({$doc->original_filename})"
        );

        return back()->with('success', 'Document registered in repository');
    }

    public function toggleTrash(Request $request, Document $document)
    {
        $document->is_trashed = !$document->is_trashed;
        $document->trashed_at = $document->is_trashed ? now() : null;
        $document->save();

        $action = $document->is_trashed ? 'DOCUMENT_TRASHED' : 'DOCUMENT_RESTORED';

        AuditLog::log(
            action: $action,
            department: 'Documents',
            entityType: 'Document',
            entityId: $document->id,
            description: "Document {$document->title} " . ($document->is_trashed ? 'moved to recycle bin' : 'restored')
        );

        return back()->with('success', $document->is_trashed ? 'Moved to recycle bin' : 'Document restored');
    }
}
