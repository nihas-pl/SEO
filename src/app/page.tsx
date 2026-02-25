import Link from "next/link";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { ArrowRight, BarChart3, Edit3, Globe, LineChart, MessageSquare, Search, ShieldCheck, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 selection:bg-indigo-500/30 font-sans">
      {/* Navbar View */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-indigo-600" />
            <span className="text-xl font-bold tracking-tight">AutoRank.ai</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <Link href="#features" className="hover:text-indigo-600 transition">Features</Link>
            <Link href="#how-it-works" className="hover:text-indigo-600 transition">How it Works</Link>
            <Link href="#pricing" className="hover:text-indigo-600 transition">Pricing</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="#pricing" className="text-sm font-medium hover:text-indigo-600 transition hidden sm:inline-block">View pricing</Link>
            <Link href="#pricing">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-all shadow-md hover:shadow-lg">
                Start 3-Day Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-transparent to-transparent dark:from-indigo-900/20"></div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100 mb-6 font-medium">
              ✨ The new standard for organic growth
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
              Get organic traffic from <br className="hidden md:block" /> Google & AI tools on <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">autopilot.</span>
            </h1>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Show up where your ideal customers actually search. Dominate traditional SEO, ChatGPT, Gemini, Claude, and Perplexity without lifting a finger.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="#pricing">
                <Button size="lg" className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto text-base h-12 px-8 shadow-xl shadow-indigo-600/20">
                  Start 3-Day Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="rounded-full h-12 px-8 text-base bg-white dark:bg-neutral-900">
                Book a Demo
              </Button>
            </div>
            {/* Dashboard Preview mockup */}
            <div className="mt-16 relative max-w-5xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-50 dark:from-neutral-950 via-transparent to-transparent z-10 h-full w-full bottom-0 left-0"></div>
              <div className="rounded-xl border bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden translate-y-4">
                <div className="border-b bg-neutral-100/50 dark:bg-neutral-800/50 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                </div>
                <div className="p-8 pb-32 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-90 blur-[1px]">
                  <Card className="shadow-sm"><CardHeader><CardTitle className="text-lg">Visibility Score</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold text-indigo-600">84%</p></CardContent></Card>
                  <Card className="shadow-sm"><CardHeader><CardTitle className="text-lg">AI Mentions</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold text-violet-600">1,240</p></CardContent></Card>
                  <Card className="shadow-sm"><CardHeader><CardTitle className="text-lg">Articles Published</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold">142</p></CardContent></Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="py-24 bg-white dark:bg-neutral-900 border-y">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Grow in 3 Simple Steps</h2>
              <p className="text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">A completely hands-free approach to scaling your organic presence across all modern search engines.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-neutral-100 dark:bg-neutral-800 -translate-y-1/2 hidden md:block z-0"></div>

              <div className="relative z-10 flex flex-col items-center text-center bg-white dark:bg-neutral-900 p-6">
                <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 mb-6 shadow-sm border border-indigo-200 dark:border-indigo-800">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3">1. Business Analysis</h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm">We crawl your site, analyze your competitors, and identify exactly where you are missing out on high-intent organic traffic.</p>
              </div>

              <div className="relative z-10 flex flex-col items-center text-center bg-white dark:bg-neutral-900 p-6">
                <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-600 mb-6 shadow-sm border border-violet-200 dark:border-violet-800">
                  <Edit3 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3">2. Growth Strategy</h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm">Our AI builds a custom 30-day content plan designed to capture search volume and rank natively inside LLM answers.</p>
              </div>

              <div className="relative z-10 flex flex-col items-center text-center bg-white dark:bg-neutral-900 p-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 mb-6 shadow-sm border border-emerald-200 dark:border-emerald-800">
                  <Zap className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3">3. Autopilot Execution</h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm">We automatically generate, format, and publish articles directly to your CMS, while securing high-quality backlinks.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Features */}
        <section id="features" className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Dominate Search</h2>
              <p className="text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">Stop managing 5 different SEO tools. Our platform handles the entire organic pipeline in one place.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <FeatureCard
                icon={<Edit3 />}
                title="Daily SEO Articles"
                description="LLM-optimized, long-form content written perfectly in your brand's unique tone of voice."
              />
              <FeatureCard
                icon={<Globe />}
                title="CMS Autopublishing"
                description="Connect WordPress, Webflow, Shopify, or Wix once. We handle formatting, images, and publishing."
              />
              <FeatureCard
                icon={<LineChart />}
                title="AI Search Visibility"
                description="Track how often you're recommended by ChatGPT, Claude, and Perplexity when buyers search."
              />
              <FeatureCard
                icon={<BarChart3 />}
                title="Backlink Network"
                description="Gain access to a private, high-quality backlink exchange network to passively boost Domain Rating."
              />
              <FeatureCard
                icon={<ShieldCheck />}
                title="Technical SEO Audit"
                description="Automated scanning ensures your site stays readable by Googlebots and LLM web crawlers."
              />
              <FeatureCard
                icon={<MessageSquare />}
                title="Reddit AI Agent"
                description="We find high-value Reddit threads in your niche and tell you exactly where to comment to drive traffic."
              />
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="py-24 bg-indigo-900 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Success Stories</h2>
              <p className="text-indigo-200 max-w-xl mx-auto">See how businesses are scaling their traffic without hiring expensive agencies.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card className="bg-indigo-950/50 border-indigo-800 text-white">
                <CardHeader>
                  <div className="text-indigo-300 font-semibold mb-2">MyHair.ai</div>
                  <CardTitle className="text-2xl">450% Traffic Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-indigo-200 text-sm">&ldquo;Within 2 months of letting the autopilot run, our site started showing up as the #1 recommended tool in Perplexity answers.&rdquo;</p>
                </CardContent>
              </Card>

              <Card className="bg-indigo-950/50 border-indigo-800 text-white">
                <CardHeader>
                  <div className="text-indigo-300 font-semibold mb-2">SaaSFlow</div>
                  <CardTitle className="text-2xl">+52 Quality Backlinks</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-indigo-200 text-sm">&ldquo;The internal backlink exchange saved us thousands of dollars a month. We literally just connect our blog and watch our DR climb.&rdquo;</p>
                </CardContent>
              </Card>

              <Card className="bg-indigo-950/50 border-indigo-800 text-white">
                <CardHeader>
                  <div className="text-indigo-300 font-semibold mb-2">Growth Agency</div>
                  <CardTitle className="text-2xl">Managed 15 Clients</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-indigo-200 text-sm">&ldquo;We replaced our entire writing team and three separate software subscriptions with the agency plan. Margins went through the roof.&rdquo;</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-neutral-600 dark:text-neutral-400">Everything you need in one powerful subscription.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Main Plan */}
              <Card className="border-indigo-200 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-indigo-600"></div>
                <CardHeader>
                  <CardTitle className="text-2xl">All-In-One Autopilot</CardTitle>
                  <CardDescription>Perfect for founders and marketing teams.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-5xl font-extrabold">$249</span>
                    <span className="text-neutral-500">/mo</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-2 text-sm"><CheckIcon className="text-indigo-600" /> 30 SEO Articles per month</li>
                    <li className="flex items-center gap-2 text-sm"><CheckIcon className="text-indigo-600" /> Automated CMS Publishing</li>
                    <li className="flex items-center gap-2 text-sm"><CheckIcon className="text-indigo-600" /> Backlink Exchange Access</li>
                    <li className="flex items-center gap-2 text-sm"><CheckIcon className="text-indigo-600" /> AI Search Visibility Tracking</li>
                    <li className="flex items-center gap-2 text-sm"><CheckIcon className="text-indigo-600" /> Daily Technical SEO Audits</li>
                    <li className="flex items-center gap-2 text-sm"><CheckIcon className="text-indigo-600" /> Real-time Reddit Agent</li>
                  </ul>
                  <Link href="#pricing">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-12">Start 3-Day Free Trial</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Agency Plan */}
              <Card className="bg-neutral-50 dark:bg-neutral-900/50">
                <CardHeader>
                  <CardTitle className="text-2xl">Agency / Whitelabel</CardTitle>
                  <CardDescription>For agencies managing multiple clients.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-5xl font-extrabold text-neutral-400">Custom</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-2 text-sm"><CheckIcon className="text-neutral-400" /> Unlimited Workspaces</li>
                    <li className="flex items-center gap-2 text-sm"><CheckIcon className="text-neutral-400" /> White-label Reporting</li>
                    <li className="flex items-center gap-2 text-sm"><CheckIcon className="text-neutral-400" /> Team Member Access</li>
                    <li className="flex items-center gap-2 text-sm"><CheckIcon className="text-neutral-400" /> Custom Article Quotation</li>
                    <li className="flex items-center gap-2 text-sm"><CheckIcon className="text-neutral-400" /> Dedicated Account Manager</li>
                  </ul>
                  <Link href="#pricing">
                    <Button variant="outline" className="w-full rounded-full h-12">Contact Sales</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-neutral-950 text-neutral-400 py-12 border-t border-neutral-800">
        <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4 text-white">
              <Zap className="h-6 w-6 text-indigo-500" />
              <span className="text-xl font-bold tracking-tight">AutoRank.ai</span>
            </div>
            <p className="text-sm">The new standard for organic growth on Google and AI models.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#features" className="hover:text-white transition">Features</Link></li>
              <li><Link href="#pricing" className="hover:text-white transition">Pricing</Link></li>
              <li><Link href="#" className="hover:text-white transition">Backlinks Network</Link></li>
              <li><Link href="#" className="hover:text-white transition">AI Search Audit</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white transition">Success Stories</Link></li>
              <li><Link href="#" className="hover:text-white transition">Blog</Link></li>
              <li><Link href="#" className="hover:text-white transition">Contact Us</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white transition">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-white transition">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-neutral-800 text-sm flex justify-between items-center">
          <p>© {new Date().getFullYear()} AutoRank.ai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function cx(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
  size?: "default" | "lg";
};

function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  const variantClass =
    variant === "outline"
      ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
      : "bg-primary text-primary-foreground hover:bg-primary/90";
  const sizeClass = size === "lg" ? "h-11 px-8 text-base" : "h-10 px-4 py-2";

  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variantClass,
        sizeClass,
        className
      )}
      {...props}
    />
  );
}

function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("rounded-xl border bg-card text-card-foreground shadow-sm", className)} {...props} />;
}

function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cx("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />;
}

function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx("text-sm text-muted-foreground", className)} {...props} />;
}

function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("p-6 pt-0", className)} {...props} />;
}

function FeatureCard({ icon, title, description }: { icon: ReactNode, title: string, description: string }) {
  return (
    <Card className="border-none shadow-none bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors">
      <CardHeader>
        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 flex items-center justify-center rounded-lg mb-4">
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-neutral-600 dark:text-neutral-400">{description}</p>
      </CardContent>
    </Card>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${className}`}>
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}
