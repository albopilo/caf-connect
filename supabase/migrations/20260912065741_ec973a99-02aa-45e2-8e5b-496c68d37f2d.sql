REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "products public read" ON public.products;
CREATE POLICY "products anon read" ON public.products FOR SELECT TO anon USING (pos_hidden = false);
CREATE POLICY "products auth read" ON public.products FOR SELECT TO authenticated USING (pos_hidden = false OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

DROP POLICY "programs public read" ON public.marketing_programs;
CREATE POLICY "programs anon read" ON public.marketing_programs FOR SELECT TO anon USING (active = true);
CREATE POLICY "programs auth read" ON public.marketing_programs FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));

DROP POLICY "vouchers public read" ON public.vouchers;
CREATE POLICY "vouchers anon read" ON public.vouchers FOR SELECT TO anon USING (active = true);
CREATE POLICY "vouchers auth read" ON public.vouchers FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));