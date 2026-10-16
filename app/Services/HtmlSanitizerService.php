<?php

namespace App\Services;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMXPath;

class HtmlSanitizerService
{
    /**
     * Allowed HTML tags.
     */
    protected const ALLOWED_TAGS = [
        'p', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
        'blockquote', 'ul', 'ol', 'li', 'code', 'pre', 'a', 'span', 'img', 'br', 'hr',
    ];

    /**
     * Allowed attributes per tag.
     */
    protected const ALLOWED_ATTRIBUTES = [
        'a' => ['href', 'title', 'target', 'rel', 'class'],
        'img' => ['src', 'alt', 'title', 'class', 'width', 'height'],
        'span' => ['class', 'style', 'data-type', 'data-id', 'data-label'],
        'code' => ['class'],
        'pre' => ['class'],
        'p' => ['class', 'style'],
        'h2' => ['class', 'style'],
        'h3' => ['class', 'style'],
        'blockquote' => ['class'],
        'ul' => ['class'],
        'ol' => ['class'],
        'li' => ['class'],
    ];

    /**
     * Clean/sanitize HTML content (alias).
     */
    public function clean(?string $input): string
    {
        return $this->sanitize($input);
    }

    /**
     * Sanitize HTML content using an allowlist approach.
     */
    public function sanitize(?string $input): string
    {
        if ($input === null || trim($input) === '') {
            return '';
        }

        // If string has no HTML tags at all, convert plain text newlines into paragraphs or clean breaks
        if (!preg_match('/<[a-z][\s\S]*>/i', $input)) {
            $escaped = htmlspecialchars($input, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            return nl2br($escaped);
        }

        $internalErrors = libxml_use_internal_errors(true);

        $dom = new DOMDocument('1.0', 'UTF-8');
        // Wrap with container to retain fragments
        $wrapped = '<?xml encoding="UTF-8"><div>' . $input . '</div>';
        $dom->loadHTML($wrapped, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);

        libxml_clear_errors();
        libxml_use_internal_errors($internalErrors);

        $xpath = new DOMXPath($dom);

        // 1. Remove dangerous nodes completely (script, iframe, object, embed, style, applet, meta, link, svg)
        $dangerousNodes = $xpath->query('//script | //iframe | //object | //embed | //style | //applet | //meta | //link | //svg | //form | //input | //button');
        if ($dangerousNodes) {
            foreach ($dangerousNodes as $node) {
                $node->parentNode?->removeChild($node);
            }
        }

        // 2. Walk through all nodes and sanitize tags and attributes
        $this->sanitizeNode($dom->documentElement);

        // Extract inner HTML of wrapper div
        $wrapper = $dom->getElementsByTagName('div')->item(0);
        if (!$wrapper) {
            return '';
        }

        $cleanHtml = '';
        foreach ($wrapper->childNodes as $child) {
            $cleanHtml .= $dom->saveHTML($child);
        }

        return trim($cleanHtml);
    }

    /**
     * Recursively sanitize a DOM node.
     */
    protected function sanitizeNode(DOMNode $node): void
    {
        if ($node->nodeType === XML_ELEMENT_NODE && $node instanceof DOMElement) {
            $tagName = strtolower($node->tagName);

            // If not wrapper div and not allowed tag, unwrap or remove
            if ($tagName !== 'div' && !in_array($tagName, self::ALLOWED_TAGS, true)) {
                $parent = $node->parentNode;
                if ($parent) {
                    while ($node->hasChildNodes()) {
                        $child = $node->firstChild;
                        $node->removeChild($child);
                        $parent->insertBefore($child, $node);
                        $this->sanitizeNode($child);
                    }
                    $parent->removeChild($node);
                    return;
                }
            }

            // Sanitize attributes
            if ($node->hasAttributes()) {
                $attrsToRemove = [];
                $allowedForTag = self::ALLOWED_ATTRIBUTES[$tagName] ?? [];

                foreach ($node->attributes as $attr) {
                    $attrName = strtolower($attr->nodeName);
                    $attrValue = trim($attr->nodeValue);

                    // Block any on* event handler
                    if (str_starts_with($attrName, 'on')) {
                        $attrsToRemove[] = $attr->nodeName;
                        continue;
                    }

                    // Check attribute allowlist
                    if (!in_array($attrName, $allowedForTag, true) && $tagName !== 'div') {
                        $attrsToRemove[] = $attr->nodeName;
                        continue;
                    }

                    // Validate href
                    if ($attrName === 'href') {
                        if (!$this->isSafeHref($attrValue)) {
                            $attrsToRemove[] = $attr->nodeName;
                        } else {
                            $node->setAttribute('rel', 'noopener noreferrer');
                            if (!$node->hasAttribute('target')) {
                                $node->setAttribute('target', '_blank');
                            }
                        }
                    }

                    // Validate src
                    if ($attrName === 'src') {
                        if (!$this->isSafeSrc($attrValue)) {
                            $attrsToRemove[] = $attr->nodeName;
                        }
                    }

                    // Validate style (allow color/background-color only, no expressions or url)
                    if ($attrName === 'style') {
                        $safeStyle = $this->sanitizeStyle($attrValue);
                        if ($safeStyle) {
                            $node->setAttribute('style', $safeStyle);
                        } else {
                            $attrsToRemove[] = $attr->nodeName;
                        }
                    }
                }

                foreach ($attrsToRemove as $attrName) {
                    $node->removeAttribute($attrName);
                }
            }
        }

        // Process children
        $children = [];
        foreach ($node->childNodes as $child) {
            $children[] = $child;
        }
        foreach ($children as $child) {
            $this->sanitizeNode($child);
        }
    }

    /**
     * Check if href value is safe.
     */
    protected function isSafeHref(string $href): bool
    {
        $href = trim($href);
        if ($href === '' || str_starts_with($href, '#') || str_starts_with($href, '/')) {
            return true;
        }

        $scheme = parse_url($href, PHP_URL_SCHEME);
        if (!$scheme) {
            return true;
        }

        return in_array(strtolower($scheme), ['http', 'https', 'mailto'], true);
    }

    /**
     * Check if img src is safe.
     */
    protected function isSafeSrc(string $src): bool
    {
        $src = trim($src);
        if (str_starts_with($src, '/') || str_starts_with($src, 'data:image/')) {
            return true;
        }

        $scheme = parse_url($src, PHP_URL_SCHEME);
        if (!$scheme) {
            return true;
        }

        return in_array(strtolower($scheme), ['http', 'https'], true);
    }

    /**
     * Sanitize inline CSS styles.
     */
    protected function sanitizeStyle(string $style): string
    {
        // Strip expressions and urls
        if (preg_match('/expression|javascript|url\s*\(/i', $style)) {
            return '';
        }

        $declarations = explode(';', $style);
        $safeDeclarations = [];

        foreach ($declarations as $declaration) {
            $parts = explode(':', $declaration, 2);
            if (count($parts) === 2) {
                $property = strtolower(trim($parts[0]));
                $value = trim($parts[1]);

                if (in_array($property, ['color', 'background-color', 'font-weight', 'text-decoration'], true)) {
                    // Restrict value to safe color or simple string
                    if (preg_match('/^(#[0-9a-fA-F]{3,8}|rgba?\([0-9\s,\.]+\)|hsla?\([0-9\s,%\.]+\)|bold|normal|underline|none)$/i', $value)) {
                        $safeDeclarations[] = "{$property}: {$value}";
                    }
                }
            }
        }

        return implode('; ', $safeDeclarations);
    }

    /**
     * Extract mentioned user IDs from comment content.
     * Looks for structured mention nodes:
     * <span data-type="mention" data-id="12" ...>
     * Returns an array of integer user IDs.
     */
    public static function extractMentionUserIds(string $content): array
    {
        $userIds = [];

        // 1. Structured data-type="mention" data-id="..."
        if (preg_match_all('/data-type=["\']mention["\'][^>]*data-id=["\'](\d+)["\']/i', $content, $matches)) {
            foreach ($matches[1] as $id) {
                $userIds[] = (int) $id;
            }
        }
        if (preg_match_all('/data-id=["\'](\d+)["\'][^>]*data-type=["\']mention["\']/i', $content, $matches)) {
            foreach ($matches[1] as $id) {
                $userIds[] = (int) $id;
            }
        }

        // 2. Return unique IDs
        return array_values(array_unique(array_filter($userIds)));
    }
}
