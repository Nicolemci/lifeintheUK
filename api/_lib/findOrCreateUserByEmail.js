async function findOrCreateUserByEmail(supabase, email) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
  });

  if (created?.user?.id) {
    return {
      userId: created.user.id,
      created: true,
    };
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: normalizedEmail,
  });

  if (linkData?.user?.id) {
    return {
      userId: linkData.user.id,
      created: false,
    };
  }

  throw createError || linkError || new Error(`Unable to resolve Supabase user for ${normalizedEmail}.`);
}

module.exports = {
  findOrCreateUserByEmail,
};
