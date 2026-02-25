/**
 * Mock Service for CMS Publishing
 * 
 * Abstraction layer to publish generated articles to
 * WordPress, Webflow, Shopify, etc.
 */

export interface CMSPublisher {
    publishArticle(article: any, site: any): Promise<{ success: boolean; url: string; error?: string }>;
    updateArticle(article: any, site: any): Promise<{ success: boolean; url: string; error?: string }>;
}

export class WordPressPublisher implements CMSPublisher {
    async publishArticle(article: any, site: any) {
        console.log(`[CMS MOCK] Publishing article "${article.title}" to WordPress site ${site.domain}`);

        // MOCK WP REST API call
        // await fetch(`${site.url}/wp-json/wp/v2/posts`, { method: 'POST', body: ... })

        return {
            success: true,
            url: `https://${site.domain}/blog/${article.title.toLowerCase().replace(/ /g, '-')}`
        };
    }

    async updateArticle(article: any, site: any) {
        console.log(`[CMS MOCK] Updating article "${article.title}" on WordPress site ${site.domain}`);
        return { success: true, url: article.url };
    }
}

export class WebflowPublisher implements CMSPublisher {
    async publishArticle(article: any, site: any) {
        console.log(`[CMS MOCK] Publishing article "${article.title}" to Webflow collection`);
        return { success: true, url: `https://${site.domain}/post/${article.title.toLowerCase().replace(/ /g, '-')}` };
    }
    async updateArticle() { return { success: true, url: "" }; }
}

export function getPublisher(type: string): CMSPublisher {
    switch (type.toLowerCase()) {
        case 'wordpress': return new WordPressPublisher();
        case 'webflow': return new WebflowPublisher();
        default: throw new Error(`Unsupported CMS type: ${type}`);
    }
}
