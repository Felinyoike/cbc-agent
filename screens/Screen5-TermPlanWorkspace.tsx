<!-- screenType: "desktop-medium" width: "1440" height: "1024" name: "Screen 5" colorTheme: "default" screenId: "10d1a670-8673-44f3-8b06-4c6048d0333e" -->
<div className="bg-white text-neutral-950 flex w-full h-fit">
  <aside className="shrink-0 bg-neutral-50 text-neutral-950 border-neutral-200 border-t-0 border-r-1 border-b-0 border-l-0 border-solid flex p-4 flex-col gap-6 w-64 h-256">
    <div className="flex px-2 items-center gap-2">
      <div className="size-9 rounded-lg bg-neutral-900 text-neutral-50 flex justify-center items-center">
        <Sprout className="size-5" />
      </div>
      <div className="flex flex-col">
        <span className="leading-tight font-semibold text-sm leading-5">
          CBC Teacher
        </span>
        <span className="leading-tight text-neutral-500 text-xs leading-4">
          Workflow Agent
        </span>
      </div>
    </div>
    <nav className="flex flex-col justify-start items-stretch gap-1">
      <a className="rounded-lg text-neutral-950 text-sm leading-5 flex px-3 py-2 items-center gap-3">
        <Home className="size-4" />
        <span>Home</span>
      </a>
      <a className="rounded-lg text-neutral-950 text-sm leading-5 flex px-3 py-2 items-center gap-3">
        <BookOpen className="size-4" />
        <span>Curriculum Explorer</span>
      </a>
      <a className="font-medium rounded-lg bg-neutral-900 text-neutral-50 text-sm leading-5 flex px-3 py-2 items-center gap-3">
        <FileText className="size-4" />
        <span>Term Plans</span>
      </a>
      <a className="rounded-lg text-neutral-950 text-sm leading-5 flex px-3 py-2 items-center gap-3">
        <Calendar className="size-4" />
        <span>Daily Lessons</span>
      </a>
      <a className="rounded-lg text-neutral-950 text-sm leading-5 flex px-3 py-2 items-center gap-3">
        <CheckCircle className="size-4" />
        <span>Reflections</span>
      </a>
      <a className="rounded-lg text-neutral-950 text-sm leading-5 flex px-3 py-2 items-center gap-3">
        <Library className="size-4" />
        <span>My Library</span>
      </a>
    </nav>
    <div className="rounded-lg bg-neutral-100 text-neutral-900 flex mt-auto px-3 py-2 items-center gap-2">
      <div className="size-8 font-semibold rounded-full bg-neutral-900 text-neutral-50 text-xs leading-4 flex justify-center items-center">
        JK
      </div>
      <div className="leading-tight flex flex-col">
        <span className="font-medium text-sm leading-5">Jane Kamau</span>
        <span className="text-neutral-500 text-xs leading-4">Teacher</span>
      </div>
    </div>
  </aside>
  <div className="flex flex-col flex-1 h-256 overflow-hidden">
    <header className="shrink-0 border-neutral-200 border-t-0 border-r-0 border-b-1 border-l-0 border-solid flex px-8 py-3 justify-between items-center gap-4">
      <div className="text-sm leading-5 flex items-center gap-2">
        <GraduationCap className="size-4 text-neutral-500" />
        <span className="font-medium">Grade 5</span>
        <span className="text-neutral-500">·</span>
        <span className="font-medium">Agriculture</span>
        <span className="text-neutral-500">·</span>
        <span className="font-medium">Term 1</span>
        <span className="text-neutral-500">·</span>
        <span className="font-medium">2026</span>
        <span className="text-neutral-500">·</span>
        <span className="font-medium">5 East</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-neutral-500 text-xs leading-4 ml-1 px-2 h-7"
        >
          Change
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Search className="size-4 top-1/2 -translate-y-1/2 text-neutral-500 absolute left-3" />
          <Input placeholder="Ask about curriculum" className="pl-9 h-9" />
        </div>
        <Badge
          variant="outline"
          className="text-amber-700 border-amber-500/50 border-0 border-solid gap-1"
        >
          <FlaskConical className="size-3" />
          Prototype / Mock data
        </Badge>
        <button className="relative size-9 rounded-full border-neutral-200 border-1 border-solid flex justify-center items-center">
          <Bell className="size-4" />
          <span className="size-2 rounded-full bg-[#e7000b] absolute -right-0.5 -top-0.5" />
        </button>
      </div>
    </header>
    <div className="overflow-y-auto flex px-8 py-6 flex-col flex-1 gap-6">
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-2xl leading-8 tracking-tight">
              Draft term plan
            </h1>
            <Badge className="bg-amber-100 text-amber-800 border-black/1 border-0 border-solid">
              Draft
            </Badge>
          </div>
          <p className="text-neutral-500 text-sm leading-5">
            Grade 5 · Agriculture · Term 1 · 5 East · Academic Year 2026
          </p>
        </div>
        <div className="min-w-56 flex flex-col items-end gap-2">
          <span className="font-medium text-sm leading-5">
            2 of 10 planning units reviewed
          </span>
          <div className="rounded-full bg-neutral-100 w-56 h-2 overflow-hidden">
            <div
              className="rounded-full bg-neutral-900 h-full"
              style={{ width: "20%" }}
            />
          </div>
          <span className="text-neutral-500 text-xs leading-4">
            Workflow progress, not learner achievement
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[380px_1fr] items-start gap-6">
        <Card className="p-6 gap-4">
          <CardHeader className="p-0 gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-emerald-700 border-emerald-600/40 border-0 border-solid gap-1"
              >
                <ShieldCheck className="size-3" />
                Official curriculum evidence
              </Badge>
            </div>
            <div className="text-neutral-500 text-sm leading-5 flex pt-1 items-center gap-1">
              <span className="font-medium text-neutral-950">
                Food Production Processes
              </span>
              <ChevronRight className="size-3.5" />
              <span className="font-medium text-neutral-950">
                Soil Conservation
              </span>
            </div>
            <span className="text-neutral-500 text-xs leading-4">
              KICD design · Page 13
            </span>
          </CardHeader>
          <CardContent className="flex p-0 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold uppercase text-neutral-500 text-xs leading-4 tracking-wide">
                Specific Learning Outcomes
              </span>
              <ul className="list-disc text-sm leading-5 flex pl-4 flex-col gap-1">
                <li>Identify methods of soil conservation in the locality.</li>
                <li>Practise a soil conservation method at school or home.</li>
                <li>Appreciate the importance of soil conservation.</li>
              </ul>
            </div>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold uppercase text-neutral-500 text-xs leading-4 tracking-wide">
                Suggested Learning Experiences
              </span>
              <ul className="list-disc text-sm leading-5 flex pl-4 flex-col gap-1">
                <li>
                  Discuss soil conservation methods used in the community.
                </li>
                <li>Construct terraces using a soil model.</li>
              </ul>
            </div>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold uppercase text-neutral-500 text-xs leading-4 tracking-wide">
                Key Inquiry Questions
              </span>
              <ul className="list-disc text-sm leading-5 flex pl-4 flex-col gap-1">
                <li>Why is soil conservation important in farming?</li>
                <li>How can we conserve soil in our locality?</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</div>;
