<!-- screenType: "desktop-medium" width: "1440" height: "1024" name: "Screen 1" colorTheme: "default" screenId: "090be99f-5395-451e-ac36-e9ae1abc7362" -->
<div className="bg-white text-neutral-950 w-full h-fit">
  <div className="relative min-h-[1024px] bg-[oklch(0.985_0.008_95)] flex p-12 justify-center items-center w-full">
    <div className="bg-[oklch(0.96_0.03_85)] rounded-full border-neutral-200 border-1 border-solid flex absolute right-8 top-8 px-4 py-1.5 items-center gap-2">
      <FlaskConical className="size-3.5 text-[oklch(0.55_0.1_75)]" />
      <span className="text-[oklch(0.5_0.09_75)] font-medium text-xs leading-4">
        Prototype / Mock data
      </span>
    </div>
    <div className="flex absolute left-8 top-8 items-center gap-2.5">
      <div className="size-9 bg-[oklch(0.45_0.07_165)] rounded-lg flex justify-center items-center">
        <Sprout className="size-5 text-[oklch(0.985_0_0)]" />
      </div>
      <div className="leading-tight flex flex-col">
        <span className="text-[oklch(0.25_0.02_240)] font-semibold text-sm leading-5">
          CBC Teacher Workflow
        </span>
        <span className="text-neutral-500 text-xs leading-4">
          KICD-aligned workspace
        </span>
      </div>
    </div>
    <Card className="max-w-2xl shadow-sm bg-white border-neutral-200 border-0 border-solid p-0 gap-0 w-full overflow-hidden">
      <div className="relative w-full h-40 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1536337005238-94b997371b40?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHxLZW55YW4lMjBjbGFzc3Jvb20lMjBzdHVkZW50cyUyMGxlYXJuaW5nfGVufDF8MHx8fDE3ODc3NTAyMjh8MA&ixlib=rb-4.1.0&q=80&w=400"
          alt="Kenyan classroom learners"
          className="object-cover w-full h-full"
          data-photoid="83tkHLPgg2Q"
          data-authorname="Ben White"
          data-authorurl="https://unsplash.com/@benwhitephotography"
          data-blurhash="LNI}t=5rIUtR.mTKVs$eR5Vssowu"
        />
        <div className="bg-gradient-to-t from-[oklch(0.25_0.03_165/0.75)] to-[oklch(0.25_0.03_165/0.2)] absolute inset-0" />
        <div className="flex absolute left-6 bottom-4 items-center gap-2">
          <div className="size-8 bg-[oklch(0.985_0_0/0.9)] rounded-md flex justify-center items-center">
            <Compass className="size-4 text-[oklch(0.45_0.07_165)]" />
          </div>
          <span className="text-[oklch(0.985_0_0)] font-medium text-sm leading-5">
            First-time setup
          </span>
        </div>
      </div>
      <div className="flex p-8 flex-col gap-6">
        <CardHeader className="p-0 gap-2">
          <CardTitle className="text-[oklch(0.25_0.02_240)] font-semibold text-2xl leading-8 tracking-tight">
            Set your teaching context
          </CardTitle>
          <CardDescription className="leading-relaxed text-neutral-500 text-sm leading-5">
            This context controls the curriculum results and drafts shown
            throughout your workspace. You can adjust it at any time from the
            top context bar.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 p-0 gap-x-6 gap-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-[oklch(0.3_0.02_240)] font-medium text-sm leading-5 flex items-center gap-1.5">
              <GraduationCap className="size-4 text-[oklch(0.5_0.06_165)]" />
              Grade
            </label>
            <Select defaultValue="Grade 5">
              <SelectTrigger className="rounded-lg border-neutral-200 border-0 border-solid w-full">
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Grade 4">Grade 4</SelectItem>
                <SelectItem value="Grade 5">Grade 5</SelectItem>
                <SelectItem value="Grade 6">Grade 6</SelectItem>
                <SelectItem value="Grade 7">Grade 7</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[oklch(0.3_0.02_240)] font-medium text-sm leading-5 flex items-center gap-1.5">
              <BookOpen className="size-4 text-[oklch(0.5_0.06_165)]" />
              Subject / Learning Area
            </label>
            <Select defaultValue="Agriculture">
              <SelectTrigger className="rounded-lg border-neutral-200 border-0 border-solid w-full">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Agriculture">Agriculture</SelectItem>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Science & Technology">{`Science & Technology`}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[oklch(0.3_0.02_240)] font-medium text-sm leading-5 flex items-center gap-1.5">
              <CalendarRange className="size-4 text-[oklch(0.5_0.06_165)]" />
              Term
            </label>
            <Select defaultValue="Term 1">
              <SelectTrigger className="rounded-lg border-neutral-200 border-0 border-solid w-full">
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Term 1">Term 1</SelectItem>
                <SelectItem value="Term 2">Term 2</SelectItem>
                <SelectItem value="Term 3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[oklch(0.3_0.02_240)] font-medium text-sm leading-5 flex items-center gap-1.5">
              <CalendarDays className="size-4 text-[oklch(0.5_0.06_165)]" />
              Academic Year
            </label>
            <Select defaultValue="2026">
              <SelectTrigger className="rounded-lg border-neutral-200 border-0 border-solid w-full">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <label className="text-[oklch(0.3_0.02_240)] font-medium text-sm leading-5 flex items-center gap-1.5">
              <Users className="size-4 text-[oklch(0.5_0.06_165)]" />
              Class / Stream
            </label>
            <Select defaultValue="5 East">
              <SelectTrigger className="rounded-lg border-neutral-200 border-0 border-solid w-full">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5 East">5 East</SelectItem>
                <SelectItem value="5 West">5 West</SelectItem>
                <SelectItem value="5 North">5 North</SelectItem>
                <SelectItem value="5 South">5 South</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <div className="border-[oklch(0.85_0.05_200)] bg-[oklch(0.96_0.02_200)] rounded-lg border-black/1 border-1 border-solid flex p-4 items-start gap-2.5">
          <Info className="size-4 shrink-0 text-[oklch(0.5_0.08_215)] mt-0.5" />
          <p className="leading-relaxed text-[oklch(0.4_0.04_215)] text-xs leading-4">
            You are setting up
            <span className="text-[oklch(0.3_0.03_215)] font-medium">
              Grade 5 · Agriculture · Term 1 · 5 East · 2026
            </span>
            . Curriculum evidence and drafts across the workspace will be
            filtered to this context.
          </p>
        </div>
        <CardFooter className="flex p-0 justify-between items-center gap-4">
          <Button
            variant="ghost"
            className="text-[oklch(0.5_0.04_240)] font-medium text-sm leading-5"
          >
            Change context later
          </Button>
          <Button className="bg-[oklch(0.45_0.07_165)] text-[oklch(0.985_0_0)] rounded-lg px-6 gap-2">
            Continue to workspace
            <ArrowRight className="size-4" />
          </Button>
        </CardFooter>
      </div>
    </Card>
  </div>
</div>;
